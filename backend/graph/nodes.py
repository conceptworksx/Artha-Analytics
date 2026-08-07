import time

from graph.state import AgentState
from tools.data_preftech import prefetch_ticker_bundle
from tools.data_processor import process_prefetch_result
from agents.analysis.market_analyst import MarketAnalyst
from agents.analysis.news_analyst import NewsAnalyst
from agents.analysis.sector_analyst import SectorAnalyst
from agents.analysis.technical_analyst import TechnicalAnalyst
from agents.analysis.fundamental_analyst import FundamentalAnalyst
from agents.researcher.bull_researcher import BullResearcher
from agents.researcher.bear_researcher import BearResearcher
from agents.manager.research_manager import ResearchManager
from core.error import handle_node_errors
from core.logging import get_logger

logger = get_logger(__name__)


def _extract_report(result: any, report_key: str = "analysis") -> tuple:
    if isinstance(result, dict):
        return result.get(report_key, result), result.get("summary", {})
    return result, {}


def make_nodes(openrouter_api_key: str = None, thinking_level: str = "low") -> dict:
    """
    Instantiates all agents with the user's OpenRouter key and chosen thinking level.
    Returns dict of node functions with agents baked in via closures.
    Key never touches AgentState.
    """

    # Agents instantiated here with key — not at module level
    market_agent = MarketAnalyst(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )
    fundamental_agent = FundamentalAnalyst(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )
    technical_agent = TechnicalAnalyst(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )
    news_agent = NewsAnalyst(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )
    sector_agent = SectorAnalyst(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )

    # Debate agents
    bull_agent = BullResearcher(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )
    bear_agent = BearResearcher(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )
    manager_agent = ResearchManager(
        openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
    )

    # ── Node functions ────────────────────────────────────────────────────

    @handle_node_errors("data_prefetch")
    def run_data_prefetch(state: AgentState) -> dict:
        raw_bundle = prefetch_ticker_bundle(state["ticker_of_company"])
        processed_bundle = process_prefetch_result(raw_bundle)
        charts_data = processed_bundle.get("charts_data", {})
        return {"data_bundle": processed_bundle, "charts_data": charts_data}

    @handle_node_errors("market_analyst")
    def run_market_analyst(state: AgentState) -> dict:
        result = market_agent.run(state)
        report, summary = _extract_report(result)
        return {
            "market_analyst_report": report,
            "market_analyst_summary": summary,
        }

    @handle_node_errors("fundamental_analyst")
    def run_fundamental_analyst(state: AgentState) -> dict:
        result = fundamental_agent.run(state)
        report, summary = _extract_report(result)
        return {
            "fundamental_analyst_report": report,
            "fundamental_analyst_summary": summary,
        }

    @handle_node_errors("technical_analyst")
    def run_technical_analyst(state: AgentState) -> dict:
        result = technical_agent.run(state)
        report, summary = _extract_report(result)
        return {
            "technical_analyst_report": report,
            "technical_analyst_summary": summary,
        }

    @handle_node_errors("news_analyst")
    def run_news_analyst(state: AgentState) -> dict:
        result = news_agent.run(state)
        report, summary = _extract_report(result)
        return {
            "news_analyst_report": report,
            "news_analyst_summary": summary,
        }

    @handle_node_errors("sector_analyst")
    def run_sector_analyst(state: AgentState) -> dict:
        result = sector_agent.run(state)
        report, summary = _extract_report(result, "report")
        return {
            "sector_analyst_report": report,
            "sector_analyst_summary": summary,
        }

    # ── Debate nodes ──────────────────────────────────────────────────────

    @handle_node_errors("bull_researcher")
    def run_bull_researcher(state: AgentState) -> dict:
        logger.info(
            f"Running bull researcher | ticker={state.get('ticker_of_company')}"
        )
        response = bull_agent.run(state)
        debate = state.get("investment_debate", {})
        history = debate.get("debate_history", "")
        rounds = debate.get("debate_rounds", 0)

        import json

        formatted_response = (
            json.dumps(response, indent=2)
            if isinstance(response, dict)
            else str(response)
        )
        new_history = history + f"\n\n--- BULL ---\n{formatted_response}"

        return {
            "investment_debate": {
                **debate,
                "bull_thesis": response,
                "debate_history": new_history,
                "debate_rounds": rounds + 1,
                "last_speaker": "bull",
            }
        }

    @handle_node_errors("bear_researcher")
    def run_bear_researcher(state: AgentState) -> dict:
        logger.info(
            f"Running bear researcher | ticker={state.get('ticker_of_company')}"
        )
        response = bear_agent.run(state)
        debate = state.get("investment_debate", {})
        history = debate.get("debate_history", "")
        rounds = debate.get("debate_rounds", 0)

        import json

        formatted_response = (
            json.dumps(response, indent=2)
            if isinstance(response, dict)
            else str(response)
        )
        new_history = history + f"\n\n--- BEAR ---\n{formatted_response}"

        return {
            "investment_debate": {
                **debate,
                "bear_thesis": response,
                "debate_history": new_history,
                "debate_rounds": rounds + 1,
                "last_speaker": "bear",
            }
        }

    @handle_node_errors("research_manager")
    def run_research_manager(state: AgentState) -> dict:
        logger.info(
            f"Running research manager | ticker={state.get('ticker_of_company')}"
        )
        verdict = manager_agent.run(state)
        return {
            "verdict": verdict.model_dump(),
            "trade_signal": verdict.decision,
            "research_verdict": verdict.rationale,
            "investment_strategy": verdict.strategy,
        }

    @handle_node_errors("aggregator")
    def run_aggregator(state: AgentState) -> dict:
        logger.info(
            f"Running aggregator | ticker={state.get('ticker_of_company')} | "
            f"include_debate={state.get('include_debate', False)}"
        )
        return {}

    return {
        "data_prefetch": run_data_prefetch,
        "market_analyst": run_market_analyst,
        "fundamental_analyst": run_fundamental_analyst,
        "technical_analyst": run_technical_analyst,
        "news_analyst": run_news_analyst,
        "sector_analyst": run_sector_analyst,
        "aggregator": run_aggregator,
        "bull_researcher": run_bull_researcher,
        "bear_researcher": run_bear_researcher,
        "research_manager": run_research_manager,
    }
