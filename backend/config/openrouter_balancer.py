import os
import time
import threading
from typing import Any, List, Dict
from contextlib import contextmanager
from langchain_openrouter import ChatOpenRouter
from langchain_core.runnables import Runnable, RunnableLambda
from core.logging import get_logger

logger = get_logger(__name__)

# ── Available OpenRouter Model Pool ──────────────────────────────────────────
DEFAULT_FREE_MODELS: List[str] = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "inclusionai/ling-3.0-flash-fin:free",
    "inclusionai/ling-3.0-flash-sante:free",
    "inclusionai/ling-3.0-flash-vl:free",
    "nex-agi/nex-n2.5-pro:free",
    "nex-agi/nex-n2.5-mini:free",
    "dots-studio/dots-3-note-preview:free",
    "thinking-machines/inkling-small:free",
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


class OpenRouterLoadBalancer:
    """
    Load balances and manages fallbacks across OpenRouter model pool.
    - Round-robin primary model rotation.
    - Dynamic sorting by (health, in-flight load, least-recently degraded).
    - Prevents parallel executing agents from stomping on busy models.
    - Top 3 candidate models for fast failure and gateway timeout prevention.
    """

    _lock = threading.Lock()
    _counter = 0

    def __init__(
        self,
        api_key: str | None = None,
        base_models: List[str] | None = None,
        preferred_models: List[str] | str | None = None,
        **kwargs,
    ):
        self.api_key = api_key
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
            f"[LoadBalancer] Call #{idx} | primary='{ordered[0]}' (in_flight={primary_in_flight}) | pool_size={len(ordered)} | healthy={len(healthy)}"
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

            llm_inst = ChatOpenRouter(**llm_kwargs)
            base_runnable = (
                llm_inst.with_structured_output(structured_schema)
                if structured_schema is not None
                else llm_inst
            )

            def _create_logged_runnable(m_name: str, rank: int, base: Runnable):
                def _invoke_fn(input_val, config=None, **kwargs):
                    if rank > 0:
                        logger.warning(
                            f"[LoadBalancer] Fallback triggered! Primary '{primary_name}' failed -> Executing fallback candidate #{rank} '{m_name}'"
                        )
                    with ModelHealthTracker.track_execution(m_name):
                        try:
                            return base.invoke(input_val, config=config, **kwargs)
                        except Exception as exc:
                            ModelHealthTracker.mark_degraded(m_name)
                            logger.warning(
                                f"[LoadBalancer] Candidate #{rank} '{m_name}' failed | error={exc}"
                            )
                            raise

                return RunnableLambda(_invoke_fn)

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

    def stream(self, input_val: Any, config: Any = None, **kwargs) -> Any:
        runnable = self.get_runnable()
        return runnable.invoke(input_val, config=config, **kwargs)
