from langgraph.graph import END, START, StateGraph
from graph.state import AgentState
from graph.conditional_edges import should_continue_debate, should_run_debate
from core.logging import get_logger
from graph.nodes import make_nodes

logger = get_logger(__name__)


def build_graph(openrouter_api_key: str = None, thinking_level: str = "low"):
    """
    Built per request with openrouter_api_key baked into node closures.
    Key never enters AgentState — not visible in LangSmith traces.
    """

    nodes = make_nodes(openrouter_api_key, thinking_level)

    work_flow = StateGraph(AgentState)

    work_flow.add_node("data_prefetch", nodes["data_prefetch"])
    work_flow.add_node("market_analyst", nodes["market_analyst"])
    work_flow.add_node("technical_analyst", nodes["technical_analyst"])
    work_flow.add_node("news_analyst", nodes["news_analyst"])
    work_flow.add_node("fundamental_analyst", nodes["fundamental_analyst"])
    work_flow.add_node("sector_analyst", nodes["sector_analyst"])
    work_flow.add_node("aggregator", nodes["aggregator"])

    # Debate nodes
    work_flow.add_node("bull_researcher", nodes["bull_researcher"])
    work_flow.add_node("bear_researcher", nodes["bear_researcher"])
    work_flow.add_node("research_manager", nodes["research_manager"])

    # Data prefetch → parallel analysts
    work_flow.add_edge(START, "data_prefetch")
    work_flow.add_edge("data_prefetch", "market_analyst")
    work_flow.add_edge("data_prefetch", "sector_analyst")
    work_flow.add_edge("data_prefetch", "news_analyst")
    work_flow.add_edge("data_prefetch", "technical_analyst")
    work_flow.add_edge("data_prefetch", "fundamental_analyst")

    # All 5 analysts converge into the aggregator
    work_flow.add_edge("market_analyst", "aggregator")
    work_flow.add_edge("sector_analyst", "aggregator")
    work_flow.add_edge("news_analyst", "aggregator")
    work_flow.add_edge("technical_analyst", "aggregator")
    work_flow.add_edge("fundamental_analyst", "aggregator")

    # If debate is enabled, aggregator goes to bull_researcher, otherwise END
    work_flow.add_conditional_edges(
        "aggregator",
        should_run_debate,
        {
            "bull_researcher": "bull_researcher",
            END: END,
        },
    )

    # Debate: bull → bear → (loop or manager) → END
    work_flow.add_edge("bull_researcher", "bear_researcher")
    work_flow.add_conditional_edges(
        "bear_researcher",
        should_continue_debate,
        {
            "bull_researcher": "bull_researcher",
            "research_manager": "research_manager",
        },
    )
    work_flow.add_edge("research_manager", END)

    return work_flow.compile(debug=False)
