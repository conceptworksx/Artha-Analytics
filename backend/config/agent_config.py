import os

# ---------------------------------------------------------
# Agent Model Priority Pools (1 Primary + 2 Fallbacks)
# ---------------------------------------------------------

# 1. Parallel Analysts (5 concurrent agents with 5 unique primary models)
FUNDAMENTAL_ANALYST_MODELS = [
    "inclusionai/ling-3.0-flash-fin:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nex-agi/nex-n2.5-pro:free",
]

MARKET_ANALYST_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nex-agi/nex-n2.5-pro:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
]

NEWS_ANALYST_MODELS = [
    "nex-agi/nex-n2.5-mini:free",
    "inclusionai/ling-3.0-flash-sante:free",
    "inclusionai/ling-3.0-flash-vl:free",
]

TECHNICAL_ANALYST_MODELS = [
    "nvidia/nemotron-3.5-lightning:free",
    "nex-agi/nex-n2.5-pro:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]

SECTOR_ANALYST_MODELS = [
    "dots-studio/dots-3-note-preview:free",
    "thinking-machines/inkling-small:free",
    "inclusionai/ling-3.0-flash-sante:free",
]

# 2. Debate and Manager Agents
BULL_RESEARCHER_MODELS = [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nex-agi/nex-n2.5-pro:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]

BEAR_RESEARCHER_MODELS = [
    "nex-agi/nex-n2.5-pro:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
]

RESEARCH_MANAGER_MODELS = [
    "inclusionai/ling-3.0-flash-fin:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nex-agi/nex-n2.5-pro:free",
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
