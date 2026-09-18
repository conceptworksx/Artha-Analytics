import os
import time
import threading
from typing import Any, List, Dict
from contextlib import contextmanager
from langchain_openrouter import ChatOpenRouter
from langchain_core.runnables import Runnable, RunnableLambda
from core.logging import get_logger

logger = get_logger(__name__)


DEFAULT_FREE_MODELS: List[str] = [
    # Tier 1: Ultra-Fast & 99% Available (Concurrent Analysis Primaries)
    "inclusionai/ling-3.0-flash-fin:free",  # 11.7s p99, 99% avail
    "inclusionai/ling-3.0-flash-sante:free",  # 11.7s p99, 99% avail (pure text)
    "inclusionai/ling-3.0-flash-vl:free",  # 11.7s p99, 99% avail (multimodal / vision)
    # Tier 2: Deep Context & High Availability (Debate & Synthesis)
    "thinking-machines/inkling:free",  # 99s p99, 99% avail, 1.0M context
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail
    # Tier 3: Fast Secondary Fallback (75% avail, 17s latency vs 203s)
    "nvidia/nemotron-3-super-120b-a12b:free",  # 17s p99, 75% avail
    # Tier 4: High Context, High Availability, High Latency
    "nvidia/nemotron-3.5-lightning:free",  # 203s p99, 94% avail, 1.0M context
    # Tier 5: Lower Availability Tail (<75% avail)
    "nvidia/nemotron-3-ultra-550b-a55b:free",  # 121s p99, 71% avail
    "nex-agi/nex-n2.5-mini:free",  # 39.3s p99, 67% avail
]


class ModelHealthTracker:
    """
    Passive health & in-flight execution tracker for OpenRouter models.
    - Eliminates active HTTP POST probing (0 extra network calls).
    - Tracks active in-flight requests per model to prevent parallel collision.
    - Degraded models recover after a 3-minute cooldown.
    """

    _degraded: Dict[str, float] = {}  # model_name -> degraded_timestamp
    _in_flight: Dict[str, int] = {}  # model_name -> active_request_count
    _lock = threading.Lock()
    DEGRADED_COOLDOWN_SECONDS = 180  # 3 minutes

    @classmethod
    def is_healthy(cls, model_name: str) -> bool:
        now = time.time()
        with cls._lock:
            if model_name in cls._degraded:
                ts = cls._degraded[model_name]
                if now - ts < cls.DEGRADED_COOLDOWN_SECONDS:
                    return False
                else:
                    del cls._degraded[model_name]
        return True

    @classmethod
    def get_degraded_age(cls, model_name: str) -> float:
        now = time.time()
        with cls._lock:
            if model_name in cls._degraded:
                return now - cls._degraded[model_name]
        return 999999.0

    @classmethod
    def get_in_flight(cls, model_name: str) -> int:
        with cls._lock:
            return cls._in_flight.get(model_name, 0)

    @classmethod
    def mark_degraded(cls, model_name: str) -> None:
        """Mark a model as temporarily degraded when a request fails or rate-limits."""
        with cls._lock:
            cls._degraded[model_name] = time.time()
            logger.warning(
                f"[LoadBalancer] Marked model degraded for 3m | model='{model_name}'"
            )

    @classmethod
    @contextmanager
    def track_execution(cls, model_name: str):
        """Context manager to track active in-flight execution of a model."""
        with cls._lock:
            cls._in_flight[model_name] = cls._in_flight.get(model_name, 0) + 1
        try:
            yield
        finally:
            with cls._lock:
                cls._in_flight[model_name] = max(
                    0, cls._in_flight.get(model_name, 1) - 1
                )


AGENT_DISPLAY_ROLES: Dict[str, str] = {
    "TechnicalAnalyst": "Technical Analyst",
    "FundamentalAnalyst": "Fundamental Analyst",
    "MarketAnalyst": "Global Market Analyst",
    "NewsAnalyst": "News & Sentiment Analyst",
    "SectorAnalyst": "Sector Specialist",
    "BullResearcher": "Bull Researcher",
    "BearResearcher": "Bear Researcher",
    "ResearchManager": "Research Manager",
}

# Roles that perform heavy multi-report synthesis and require extended timeouts
DEBATE_MANAGER_AGENTS = {"BullResearcher", "BearResearcher", "ResearchManager"}


class OpenRouterLoadBalancer:
    """
    Load balances and manages fallbacks across OpenRouter model pool.
    - Round-robin primary model rotation.
    - Dynamic sorting by (health, in-flight load, least-recently degraded).
    - Prevents parallel executing agents from stomping on busy models.
    - Top 3 candidate models for fast failure and gateway timeout prevention.
    - Explicit failure & fallback routing logging with agent/role identification.
    """

    _lock = threading.Lock()
    _counter = 0

    def __init__(
        self,
        api_key: str | None = None,
        base_models: List[str] | None = None,
        preferred_models: List[str] | str | None = None,
        agent_name: str | None = None,
        **kwargs,
    ):
        self.api_key = api_key
        self.agent_name = agent_name or "GeneralAgent"
        self.display_role = AGENT_DISPLAY_ROLES.get(self.agent_name, self.agent_name)
        kwargs.pop("preferred_models", None)
        kwargs.pop("preferred_model", None)
        self.kwargs = kwargs
        self._has_preferred = bool(preferred_models)

        if preferred_models:
            if isinstance(preferred_models, str):
                preferred_models = [preferred_models]
            raw_pool = list(preferred_models)
            for m in base_models or DEFAULT_FREE_MODELS:
                if m not in raw_pool:
                    raw_pool.append(m)
        else:
            raw_pool = list(base_models or DEFAULT_FREE_MODELS)

        env_model = os.getenv("OPEN_ROUTER_MODEL")
        if env_model and env_model not in raw_pool:
            raw_pool.insert(0, env_model)

        self.model_pool = list(dict.fromkeys(raw_pool))

    def _get_ordered_models(self) -> List[str]:
        with OpenRouterLoadBalancer._lock:
            idx = OpenRouterLoadBalancer._counter
            OpenRouterLoadBalancer._counter += 1

        n = len(self.model_pool)
        if n == 0:
            return DEFAULT_FREE_MODELS

        if self._has_preferred:
            rotated = list(self.model_pool)
        else:
            start_idx = idx % n
            rotated = self.model_pool[start_idx:] + self.model_pool[:start_idx]

        healthy = [m for m in rotated if ModelHealthTracker.is_healthy(m)]
        degraded = [m for m in rotated if not ModelHealthTracker.is_healthy(m)]

        # Sort healthy models by active in-flight request count (idle models with 0 in-flight first)
        healthy.sort(key=lambda m: ModelHealthTracker.get_in_flight(m))

        # Sort degraded models by degraded age descending (least-recently-degraded / oldest degraded first)
        degraded.sort(
            key=lambda m: ModelHealthTracker.get_degraded_age(m), reverse=True
        )

        ordered = healthy + degraded if healthy else degraded if degraded else rotated

        primary_in_flight = ModelHealthTracker.get_in_flight(ordered[0])
        logger.info(
            f"[LoadBalancer] Call #{idx} | role='{self.display_role}' | primary='{ordered[0]}' (in_flight={primary_in_flight}) | pool_size={len(ordered)} | healthy={len(healthy)}"
        )
        return ordered

    def get_runnable(self, structured_schema: Any = None) -> Runnable:
        ordered_models = self._get_ordered_models()
        candidate_models = ordered_models[:3]
        primary_name = candidate_models[0]

        runnables = []
        for i, model_name in enumerate(candidate_models):
            llm_kwargs = dict(self.kwargs)
            llm_kwargs.pop("preferred_models", None)
            llm_kwargs.pop("preferred_model", None)
            llm_kwargs["model"] = model_name
            if self.api_key:
                llm_kwargs["openrouter_api_key"] = self.api_key

            # Adaptive role-based timeout:
            # Debate & Research Manager agents get 300s (5m); parallel analysts get 120s (2m).
            default_timeout_s = (
                300 if self.agent_name in DEBATE_MANAGER_AGENTS else 120
            )
            env_timeout = os.getenv("OPENROUTER_REQUEST_TIMEOUT") or os.getenv("OPENROUTER_TIMEOUT")
            if env_timeout:
                try:
                    default_timeout_s = float(env_timeout)
                except ValueError:
                    pass

            timeout_val = (
                llm_kwargs.pop("request_timeout", None)
                or llm_kwargs.pop("timeout", None)
                or default_timeout_s
            )
            # If passed in seconds (<= 1000), convert to milliseconds for langchain-openrouter
            if timeout_val <= 1000:
                timeout_val = int(timeout_val * 1000)
            llm_kwargs["request_timeout"] = timeout_val

            llm_inst = ChatOpenRouter(**llm_kwargs)
            base_runnable = (
                llm_inst.with_structured_output(structured_schema)
                if structured_schema is not None
                else llm_inst
            )

            def _create_logged_runnable(m_name: str, rank: int, base: Runnable):
                def _invoke_fn(input_val, config=None, **kwargs):
                    if rank > 0:
                        failed_model = candidate_models[rank - 1]
                        logger.warning(
                            f"[LoadBalancer] [Role: {self.display_role}] Fallback triggered! "
                            f"Model '{failed_model}' failed while performing {self.display_role} -> "
                            f"Routing to fallback candidate #{rank} '{m_name}'"
                        )
                    with ModelHealthTracker.track_execution(m_name):
                        try:
                            return base.invoke(input_val, config=config, **kwargs)
                        except Exception as exc:
                            ModelHealthTracker.mark_degraded(m_name)
                            if rank + 1 < len(candidate_models):
                                next_candidate = candidate_models[rank + 1]
                                logger.error(
                                    f"[LoadBalancer] [Role: {self.display_role}] Model '{m_name}' failed while performing {self.display_role} | "
                                    f"error={exc} | Routing to next candidate #{rank + 1} '{next_candidate}'"
                                )
                            else:
                                logger.error(
                                    f"[LoadBalancer] [Role: {self.display_role}] Model '{m_name}' failed while performing {self.display_role} | "
                                    f"error={exc} | All {len(candidate_models)} candidates in pool exhausted!"
                                )
                            raise

                async def _ainvoke_fn(input_val, config=None, **kwargs):
                    if rank > 0:
                        failed_model = candidate_models[rank - 1]
                        logger.warning(
                            f"[LoadBalancer] [Role: {self.display_role}] Fallback triggered! "
                            f"Model '{failed_model}' failed while performing {self.display_role} -> "
                            f"Routing to fallback candidate #{rank} '{m_name}'"
                        )
                    with ModelHealthTracker.track_execution(m_name):
                        try:
                            if hasattr(base, "ainvoke"):
                                return await base.ainvoke(
                                    input_val, config=config, **kwargs
                                )
                            return base.invoke(input_val, config=config, **kwargs)
                        except Exception as exc:
                            ModelHealthTracker.mark_degraded(m_name)
                            if rank + 1 < len(candidate_models):
                                next_candidate = candidate_models[rank + 1]
                                logger.error(
                                    f"[LoadBalancer] [Role: {self.display_role}] Model '{m_name}' failed while performing {self.display_role} | "
                                    f"error={exc} | Routing to next candidate #{rank + 1} '{next_candidate}'"
                                )
                            else:
                                logger.error(
                                    f"[LoadBalancer] [Role: {self.display_role}] Model '{m_name}' failed while performing {self.display_role} | "
                                    f"error={exc} | All {len(candidate_models)} candidates in pool exhausted!"
                                )
                            raise

                return RunnableLambda(_invoke_fn, afunc=_ainvoke_fn)

            runnables.append(_create_logged_runnable(model_name, i, base_runnable))

        primary = runnables[0]
        fallbacks = runnables[1:]

        if fallbacks:
            return primary.with_fallbacks(fallbacks, exceptions_to_handle=(Exception,))
        return primary

    def with_structured_output(self, schema: Any, **kwargs) -> Runnable:
        return self.get_runnable(structured_schema=schema)

    def invoke(self, input_val: Any, config: Any = None, **kwargs) -> Any:
        runnable = self.get_runnable()
        return runnable.invoke(input_val, config=config, **kwargs)

    async def ainvoke(self, input_val: Any, config: Any = None, **kwargs) -> Any:
        runnable = self.get_runnable()
        if hasattr(runnable, "ainvoke"):
            return await runnable.ainvoke(input_val, config=config, **kwargs)
        return runnable.invoke(input_val, config=config, **kwargs)

    def stream(self, input_val: Any, config: Any = None, **kwargs) -> Any:
        runnable = self.get_runnable()
        return runnable.invoke(input_val, config=config, **kwargs)
