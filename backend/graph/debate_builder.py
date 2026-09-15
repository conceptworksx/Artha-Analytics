from langgraph.graph import END, START, StateGraph
from graph.state import AgentState
from graph.conditional_edges import (
    should_continue_debate,
    should_run_bear_researcher,
)
from core.logging import get_logger
from graph.nodes import make_debate_nodes

logger = get_logger(__name__)


def build_debate_graph(openrouter_api_key: str = None, thinking_level: str = "low"):
    """
    Builds a standalone debate & verdict graph:
    START -> bull_researcher -> (if valid) bear_researcher -> (if valid) research_manager -> END

    Consumes existing 5-analyst reports/summaries from AgentState.
    Does NOT run data_prefetch or any of the 5 parallel analysts.
    """
    nodes = make_debate_nodes(openrouter_api_key, thinking_level)

    workflow = StateGraph(AgentState)

    workflow.add_node("bull_researcher", nodes["bull_researcher"])
    workflow.add_node("bear_researcher", nodes["bear_researcher"])
    workflow.add_node("research_manager", nodes["research_manager"])

    workflow.add_edge(START, "bull_researcher")

    # Gate 2a: Only proceed to bear researcher if bull thesis is valid according to schema
    workflow.add_conditional_edges(
        "bull_researcher",
        should_run_bear_researcher,
        {
            "bear_researcher": "bear_researcher",
            END: END,
        },
    )

    # Gate 2b: Only proceed to research manager if BOTH bull and bear theses are valid according to schema
    workflow.add_conditional_edges(
        "bear_researcher",
        should_continue_debate,
        {
            "bull_researcher": "bull_researcher",
            "research_manager": "research_manager",
            END: END,
        },
    )
    workflow.add_edge("research_manager", END)

    return workflow.compile(debug=False)
