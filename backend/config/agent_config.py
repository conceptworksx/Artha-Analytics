import os

# ---------------------------------------------------------
# Agent Model Priority Pools (1 Primary + 2 Fallbacks)
# ---------------------------------------------------------

# 1. Parallel Analysts (5 concurrent agents with 5 unique primary models + balanced tiered fallbacks)
FUNDAMENTAL_ANALYST_MODELS = [
    "inclusionai/ling-3.0-flash-fin:free",  # 11.7s p99, 99% avail (Fast financial analysis)
    "inclusionai/ling-3.0-flash-sante:free",  # 11.7s p99, 99% avail (Fast text fallback)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (High-availability Pro safety net)
]

MARKET_ANALYST_MODELS = [
    "inclusionai/ling-3.0-flash-sante:free",  # 11.7s p99, 99% avail (Fast pure-text analysis, no vision hallucination)
    "nvidia/nemotron-3-super-120b-a12b:free",  # 17s p99, 75% avail (Fast Nemotron 120B macro fallback)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (Pro safety net)
]

NEWS_ANALYST_MODELS = [
    "nex-agi/nex-n2.5-mini:free",  # 39.3s p99, 107 t/s (Lightweight model for simple classification)
    "thinking-machines/inkling:free",  # 99s p99, 99% avail, 1.0M context (Deep context news fallback)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (Pro safety net)
]

TECHNICAL_ANALYST_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",  # 17s p99, 75% avail (120B Nemotron - fast primary)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (Complex task model / Pro safety net)
    "thinking-machines/inkling:free",  # 99s p99, 99% avail, 1.0M context (Complex reasoning fallback)
]

SECTOR_ANALYST_MODELS = [
    "inclusionai/ling-3.0-flash-vl:free",  # 11.7s p99, 99% avail, 131K context (Fast news & sentiment ingestion)
    "inclusionai/ling-3.0-flash-sante:free",  # 11.7s p99, 99% avail
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (Pro fallback)
]

# 2. Debate and Manager Agents (Nemotron-centered deep reasoning & complex synthesis)
BULL_RESEARCHER_MODELS = [
    "nvidia/nemotron-3.5-lightning:free",  # 203s p99, 94% avail, 1.0M context (Nemotron high-capacity reasoning)
    "nvidia/nemotron-3-super-120b-a12b:free",  # 17s p99, 75% avail (Fast Nemotron 120B fallback)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (Promoted: High-availability Pro fallback)
]

BEAR_RESEARCHER_MODELS = [
    "nvidia/nemotron-3-ultra-550b-a55b:free",  # 121s p99, 71% avail (Nemotron 550B flagship - distinct primary)
    "nvidia/nemotron-3-super-120b-a12b:free",  # 17s p99, 75% avail (Fast Nemotron recovery - catches Ultra drops!)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (Promoted: Catches Ultra 71% failures immediately!)
]

RESEARCH_MANAGER_MODELS = [
    "nvidia/nemotron-3.5-lightning:free",  # 203s p99, 94% avail, 1.0M context (Nemotron executive synthesis)
    "nex-agi/nex-n2.5-pro:free",  # 127s p99, 95% avail (High-availability Pro synthesis backup)
    "nvidia/nemotron-3-ultra-550b-a55b:free",  # 121s p99, 71% avail (Nemotron 550B flagship)
]


def _parse_model_env(env_var: str, default_models: list) -> list:
    val = os.getenv(env_var)
    if val:
        parsed = [m.strip() for m in val.split(",") if m.strip()]
        if parsed:
            return parsed
    return default_models


AGENT_MODEL_CONFIG = {
    # Debate and Manager agents
    "ResearchManager": _parse_model_env(
        "RESEARCH_MANAGER_MODEL", RESEARCH_MANAGER_MODELS
    ),
    "BullResearcher": _parse_model_env("BULL_RESEARCHER_MODEL", BULL_RESEARCHER_MODELS),
    "BearResearcher": _parse_model_env("BEAR_RESEARCHER_MODEL", BEAR_RESEARCHER_MODELS),
    # Sector analyst
    "SectorAnalyst": _parse_model_env("SECTOR_ANALYST_MODEL", SECTOR_ANALYST_MODELS),
    # Other 4 analysts
    "FundamentalAnalyst": _parse_model_env(
        "FUNDAMENTAL_ANALYST_MODEL", FUNDAMENTAL_ANALYST_MODELS
    ),
    "MarketAnalyst": _parse_model_env("MARKET_ANALYST_MODEL", MARKET_ANALYST_MODELS),
    "NewsAnalyst": _parse_model_env("NEWS_ANALYST_MODEL", NEWS_ANALYST_MODELS),
    "TechnicalAnalyst": _parse_model_env(
        "TECHNICAL_ANALYST_MODEL", TECHNICAL_ANALYST_MODELS
    ),
}


AGENT_TOKEN_CONFIG = {
    "FundamentalAnalyst": {
        "low": 2500,
        "medium": 3000,
        "high": 4000,
    },
    "MarketAnalyst": {
        "low": 2500,
        "medium": 3000,
        "high": 4000,
    },
    "NewsAnalyst": {
        "low": 1500,
        "medium": 2000,
        "high": 2500,
    },
    "SectorAnalyst": {
        "low": 200,
        "medium": 400,
        "high": 500,
    },
    "TechnicalAnalyst": {
        "low": 2500,
        "medium": 3000,
        "high": 4000,
    },
    "ResearchManager": {
        "low": 1000,
        "medium": 1500,
        "high": 2000,
    },
    "BullResearcher": {
        "low": 1500,
        "medium": 2000,
        "high": 2500,
    },
    "BearResearcher": {
        "low": 1500,
        "medium": 2000,
        "high": 2500,
    },
}
