from langgraph.graph import END
from core.logging import get_logger
from graph.validators import validate_analyst_schemas, validate_thesis_output

logger = get_logger(__name__)

MAX_DEBATE_ROUNDS = 1


def should_run_debate(state: dict) -> str:
    """
    Gate 1: Condition to transition from aggregator to debate.
    Verifies:
    1. include_debate flag is enabled.
    2. All 5 specialist analysts (Market, Fundamental, Technical, News, Sector)
       succeeded and generated structured JSON strictly adhering to their Pydantic schemas.
    """
    if not state.get("include_debate", False):
        return END

    ticker = state.get("ticker_of_company", "UNKNOWN")
    is_valid, errors = validate_analyst_schemas(state)

    if not is_valid:
        error_msg = "; ".join(errors)
        logger.warning(
            f"Gate 1 Failed: Debate aborted because analyst schema validation failed | "
            f"ticker={ticker} | errors={error_msg}"
        )
        state["debate_skip_reason"] = f"Analyst schema validation failed: {error_msg}"
        return END

    logger.info(
        f"Gate 1 Passed: All 5 analyst schemas verified. Proceeding to debate | ticker={ticker}"
    )
    return "bull_researcher"


def should_run_bear_researcher(state: dict) -> str:
    """
    Gate 2a: Validates Bull thesis output before running Bear researcher.
    If Bull researcher failed or produced malformed JSON, halts debate immediately
    to prevent wasting tokens on Bear or Manager.
    """
    debate = state.get("investment_debate", {})
    bull_thesis = debate.get("bull_thesis")
    ticker = state.get("ticker_of_company", "UNKNOWN")

    is_valid, error = validate_thesis_output(bull_thesis, role="Bull")
    if not is_valid:
        logger.warning(
            f"Gate 2a Failed: Debate halted after Bull Researcher failed schema validation | "
            f"ticker={ticker} | reason={error}"
        )
        state["debate_skip_reason"] = (
            f"Bull researcher failed schema validation: {error}"
        )
        return END

    return "bear_researcher"


def should_continue_debate(state: dict) -> str:
    """
    Gate 2b: Condition after Bear researcher.
    Before invoking Research Manager for the final verdict, validates that BOTH
    Bull and Bear theses strictly adhere to the ThesisOutput schema.
    If either failed, halts before Research Manager is invoked to prevent incomplete data from hitting the LLM.
    """
    debate = state.get("investment_debate", {})
    ticker = state.get("ticker_of_company", "UNKNOWN")

    rounds = debate.get("debate_rounds", 0)
    last_speaker = debate.get("last_speaker", "")

    if rounds >= 2 * MAX_DEBATE_ROUNDS:
        # Validate Bull Thesis
        bull_valid, bull_err = validate_thesis_output(
            debate.get("bull_thesis"), role="Bull"
        )
        if not bull_valid:
            logger.warning(
                f"Gate 2b Failed: Research Manager verdict aborted because Bull thesis failed validation | "
                f"ticker={ticker} | reason={bull_err}"
            )
            state["debate_skip_reason"] = (
                f"Verdict aborted: Bull thesis invalid: {bull_err}"
            )
            return END

        # Validate Bear Thesis
        bear_valid, bear_err = validate_thesis_output(
            debate.get("bear_thesis"), role="Bear"
        )
        if not bear_valid:
            logger.warning(
                f"Gate 2b Failed: Research Manager verdict aborted because Bear thesis failed validation | "
                f"ticker={ticker} | reason={bear_err}"
            )
            state["debate_skip_reason"] = (
                f"Verdict aborted: Bear thesis invalid: {bear_err}"
            )
            return END

        logger.info(
            f"Gate 2b Passed: Both Bull and Bear theses valid. Proceeding to Research Manager | ticker={ticker}"
        )
        return "research_manager"

    if last_speaker == "bull":
        return "bear_researcher"
    else:
        return "bull_researcher"
