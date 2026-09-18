from typing import Any, Tuple, List
from pydantic import ValidationError
from agents.agents_models import (
    MarketSummary,
    MarketAnalysis,
    FundamentalSummary,
    FundamentalAnalysis,
    TechnicalSummary,
    TechnicalAnalysis,
    NewsSummary,
    NewsAnalysis,
    ThesisOutput,
)
from core.logging import get_logger

logger = get_logger(__name__)


def _normalize_sentiment(summary: Any) -> Any:
    """Normalize common sentiment synonyms (e.g., Bullish -> positive) to match Pydantic enums."""
    if not isinstance(summary, dict):
        return summary
    s = summary.get("sentiment")
    if isinstance(s, str):
        s_clean = s.strip().lower().replace(" ", "_")
        sentiment_map = {
            "bullish": "positive",
            "strongly_bullish": "strongly_positive",
            "very_bullish": "strongly_positive",
            "positive": "positive",
            "strongly_positive": "strongly_positive",
            "neutral": "neutral",
            "neutral_to_positive": "positive",
            "neutral_to_negative": "negative",
            "bearish": "negative",
            "strongly_bearish": "strongly_negative",
            "very_bearish": "strongly_negative",
            "negative": "negative",
            "strongly_negative": "strongly_negative",
        }
        summary["sentiment"] = sentiment_map.get(s_clean, s_clean)
    return summary


def validate_sector_summary(summary: Any) -> Tuple[bool, str]:
    """Validate sector analyst summary structure."""
    if not summary or not isinstance(summary, dict):
        return False, "Sector summary is missing or not a dictionary"

    _normalize_sentiment(summary)
    required_keys = [
        "sentiment",
        "key_driver",
        "primary_risk",
        "bull_signals",
        "bear_signals",
    ]
    missing = [k for k in required_keys if k not in summary or summary[k] is None]
    if missing:
        return False, f"Sector summary missing required fields: {', '.join(missing)}"

    if not isinstance(summary.get("bull_signals"), list) or not isinstance(
        summary.get("bear_signals"), list
    ):
        return False, "Sector summary bull_signals and bear_signals must be lists"

    return True, ""


def validate_analyst_schemas(
    state: dict, require_full_reports: bool = False
) -> Tuple[bool, List[str]]:
    """
    Validate that all 5 specialist analysts produced valid structured outputs matching their schemas.

    Gate 1: Must pass before proceeding to Bull / Bear debate.
    Checks:
    1. Market Analyst (MarketSummary, and optionally MarketAnalysis)
    2. Fundamental Analyst (FundamentalSummary, and optionally FundamentalAnalysis)
    3. Technical Analyst (TechnicalSummary, and optionally TechnicalAnalysis)
    4. News Analyst (NewsSummary, and optionally NewsAnalysis)
    5. Sector Analyst (Sector summary and report)

    Returns:
        (is_valid, list_of_error_reasons)
    """
    errors: List[str] = []
    summaries = (
        state.get("analyst_summaries")
        if isinstance(state.get("analyst_summaries"), dict)
        else {}
    )

    def _parse_report(r: Any) -> Any:
        if isinstance(r, str):
            try:
                import json

                return json.loads(r)
            except Exception:
                return r
        return r

    # 1. Market Analyst
    m_summary = _normalize_sentiment(
        state.get("market_analyst_summary") or summaries.get("market_analyst_summary")
    )
    m_report = _parse_report(
        state.get("market_analyst_report") or state.get("market_report")
    )
    if not m_summary or isinstance(m_summary, str):
        errors.append("Market analyst summary is missing or invalid string.")
    else:
        try:
            MarketSummary.model_validate(m_summary)
        except ValidationError as e:
            errors.append(
                f"Market analyst summary schema violation: {e.errors()[0]['msg']}"
            )

    if require_full_reports or (m_report and isinstance(m_report, dict)):
        if isinstance(m_report, str) or not m_report:
            errors.append("Market analyst report is missing or contains error message.")
        elif isinstance(m_report, dict):
            try:
                MarketAnalysis.model_validate(m_report)
            except ValidationError as e:
                errors.append(
                    f"Market analyst report schema violation: {e.errors()[0]['msg']}"
                )

    # 2. Fundamental Analyst
    f_summary = _normalize_sentiment(
        state.get("fundamental_analyst_summary")
        or summaries.get("fundamental_analyst_summary")
    )
    f_report = _parse_report(
        state.get("fundamental_analyst_report") or state.get("fundamental_report")
    )
    if not f_summary or isinstance(f_summary, str):
        errors.append("Fundamental analyst summary is missing or invalid string.")
    else:
        try:
            FundamentalSummary.model_validate(f_summary)
        except ValidationError as e:
            errors.append(
                f"Fundamental analyst summary schema violation: {e.errors()[0]['msg']}"
            )

    if require_full_reports or (f_report and isinstance(f_report, dict)):
        if isinstance(f_report, str) or not f_report:
            errors.append(
                "Fundamental analyst report is missing or contains error message."
            )
        elif isinstance(f_report, dict):
            try:
                FundamentalAnalysis.model_validate(f_report)
            except ValidationError as e:
                errors.append(
                    f"Fundamental analyst report schema violation: {e.errors()[0]['msg']}"
                )

    # 3. Technical Analyst
    t_summary = _normalize_sentiment(
        state.get("technical_analyst_summary")
        or summaries.get("technical_analyst_summary")
    )
    t_report = _parse_report(
        state.get("technical_analyst_report") or state.get("technical_report")
    )
    if not t_summary or isinstance(t_summary, str):
        errors.append("Technical analyst summary is missing or invalid string.")
    else:
        try:
            TechnicalSummary.model_validate(t_summary)
        except ValidationError as e:
            errors.append(
                f"Technical analyst summary schema violation: {e.errors()[0]['msg']}"
            )

    if require_full_reports or (t_report and isinstance(t_report, dict)):
        if isinstance(t_report, str) or not t_report:
            errors.append(
                "Technical analyst report is missing or contains error message."
            )
        elif isinstance(t_report, dict):
            try:
                TechnicalAnalysis.model_validate(t_report)
            except ValidationError as e:
                errors.append(
                    f"Technical analyst report schema violation: {e.errors()[0]['msg']}"
                )

    # 4. News Analyst
    n_summary = _normalize_sentiment(
        state.get("news_analyst_summary") or summaries.get("news_analyst_summary")
    )
    n_report = _parse_report(
        state.get("news_analyst_report") or state.get("news_report")
    )
    if not n_summary or isinstance(n_summary, str):
        errors.append("News analyst summary is missing or invalid string.")
    else:
        try:
            NewsSummary.model_validate(n_summary)
        except ValidationError as e:
            errors.append(
                f"News analyst summary schema violation: {e.errors()[0]['msg']}"
            )

    if require_full_reports or (n_report and isinstance(n_report, dict)):
        if isinstance(n_report, str) or not n_report:
            errors.append("News analyst report is missing or contains error message.")
        elif isinstance(n_report, dict):
            try:
                NewsAnalysis.model_validate(n_report)
            except ValidationError as e:
                errors.append(
                    f"News analyst report schema violation: {e.errors()[0]['msg']}"
                )

    # 5. Sector Analyst
    s_summary = state.get("sector_analyst_summary") or summaries.get(
        "sector_analyst_summary"
    )
    s_report = state.get("sector_analyst_report") or state.get("sector_report")
    s_valid, s_err = validate_sector_summary(s_summary)
    if not s_valid:
        errors.append(s_err)
    if require_full_reports and (
        not s_report
        or isinstance(s_report, str)
        and (
            s_report.strip().lower().startswith("error")
            or "failed" in s_report.strip().lower()[:30]
        )
    ):
        errors.append("Sector analyst report is missing or failed.")

    is_valid = len(errors) == 0
    return is_valid, errors


def validate_thesis_output(thesis_data: Any, role: str = "Debate") -> Tuple[bool, str]:
    """
    Validate that Bull or Bear researcher produced a valid ThesisOutput matching the JSON schema.

    Gate 2: Must pass for BOTH Bull and Bear before Research Manager verdict can run.
    Checks:
    1. Not None or empty.
    2. Conforms to ThesisOutput schema (title, introduction, arguments).
    3. Status != 'failure'.
    4. Title != 'Parsing Error'.
    5. Arguments list is non-empty and contains valid arguments with details.

    Returns:
        (is_valid, error_reason)
    """
    if not thesis_data:
        return False, f"{role} thesis is empty or None."

    # If it's already a Pydantic ThesisOutput model instance
    if isinstance(thesis_data, ThesisOutput):
        obj = thesis_data
    elif isinstance(thesis_data, dict):
        try:
            obj = ThesisOutput.model_validate(thesis_data)
        except ValidationError as e:
            return False, f"{role} thesis schema violation: {e.errors()[0]['msg']}"
    else:
        return (
            False,
            f"{role} thesis must be a dict or ThesisOutput instance, got {type(thesis_data).__name__}",
        )

    if obj.status == "failure":
        return False, f"{role} thesis has failure status."

    if obj.title.strip().lower() in [
        "parsing error",
        "error",
        "debate failed due to internal reasons",
    ]:
        return False, f"{role} thesis title indicates parsing error: '{obj.title}'"

    if not obj.arguments or len(obj.arguments) == 0:
        return False, f"{role} thesis has no arguments."

    for idx, arg in enumerate(obj.arguments, 1):
        if not arg.heading or not arg.heading.strip():
            return False, f"{role} thesis argument #{idx} is missing a heading."
        if not arg.details or len(arg.details) == 0:
            return False, f"{role} thesis argument #{idx} has no details."

    return True, ""
