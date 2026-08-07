from typing import TypedDict, Annotated, List, Literal
from langgraph.graph import MessagesState, add_messages


class InvestmentDebateState(TypedDict):

    bull_thesis: Annotated[
        str | dict,
        "Optimistic investment thesis highlighting potential upside drivers and catalysts.",
    ]
    bear_thesis: Annotated[
        str | dict,
        "Pessimistic investment thesis outlining key risks, weaknesses, and downside triggers.",
    ]
    debate_history: Annotated[
        str, "Chronological record of the investment debate discussion."
    ]
    final_decision: Annotated[
        str,
        "Final decision made by the research manager after evaluating both perspectives.",
    ]
    current_response: Annotated[str, "Current outcome of the researcher"]
    debate_rounds: Annotated[int, "Number of debate iterations conducted."]
    last_speaker: Annotated[str, "Who spoke last in the debate: 'bull' or 'bear'."]


class AgentState(TypedDict):

    # --- Contextual Metadata ---
    ticker_of_company: Annotated[
        str, "The specific company ticker or name target for research."
    ]
    include_debate: Annotated[
        bool, "Whether or not to include the debate phase in the research process."
    ]
    data_bundle: Annotated[
        dict,
        "Pre-fetched data bundle containing all relevant financial and market information.",
    ]
    charts_data: Annotated[dict, "Time series data for UI charts (bypasses LLM prompt)"]
    sector_of_company: Annotated[
        str, "The industry vertical the company operates within (e.g., Tech, Energy)."
    ]
    date_of_planning: Annotated[
        str, "The ISO-formatted date when the trading strategy planning commenced."
    ]

    # --- Analyst Insights ---
    market_analyst_report: Annotated[
        dict,
        "Comprehensive analysis of broader market regimes (Bullish/Bearish/Neutral).",
    ]
    market_analyst_summary: Annotated[
        dict, "Structured market summary for Bull/Bear debate."
    ]

    fundamental_analyst_report: Annotated[
        dict,
        "Evaluation of financial health, including P/E ratios, debt levels, and earnings.",
    ]
    fundamental_analyst_summary: Annotated[
        dict,
        "Structured summary used by Bull/Bear agents.",
    ]

    technical_analyst_report: Annotated[
        dict, "Technical strength of the stock based on the indicator parameters"
    ]
    technical_analyst_summary: Annotated[
        dict, "Structured technical summary for Bull/Bear debate."
    ]

    news_analyst_report: Annotated[
        dict, "Summary of recent high-impact news and PR events."
    ]
    news_analyst_summary: Annotated[
        dict, "Structured news summary for Bull/Bear debate."
    ]

    sector_analyst_report: Annotated[
        dict | str,
        "Specific analysis of sector-level trends, tailwinds, and headwinds.",
    ]
    sector_analyst_summary: Annotated[
        dict, "Structured sector summary for Bull/Bear debate."
    ]

    # --- Strategic Perspectives ---
    investment_debate: Annotated[
        InvestmentDebateState,
        "Structured state capturing the ongoing investment debate, including bull and bear arguments,"
        "discussion history, final decision, and debate iteration count.",
    ]
    investment_strategy: Annotated[
        str, "Final synthesized investment strategy derived from the debate."
    ]

    # --- Verdict (from Research Manager) ---
    verdict: Annotated[
        dict,
        "Structured verdict from the Research Manager: decision, confidence, "
        "entry_price, exit_price, stop_loss, hold_duration, rationale, strategy, "
        "bull_strength, bear_strength, key_catalysts, key_risks.",
    ]

    # --- Orchestration & Logic ---
    research_verdict: Annotated[
        str, "The synthesized conclusion produced by the Research Manager."
    ]
    trade_signal: Annotated[
        Literal["BUY", "SELL", "HOLD"], "The final binary or ternary trading decision."
    ]
    risk_profile: Annotated[
        Literal["aggressive", "conservative"],
        "The risk tolerance level applied to the trade execution.",
    ]

    # --- Final Output ---
    portfolio_action: Annotated[
        str, "The final structured instruction for portfolio allocation or execution."
    ]
