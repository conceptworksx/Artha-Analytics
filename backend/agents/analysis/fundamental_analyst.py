import json
from langchain_core.messages import HumanMessage
from langchain_core.runnables import (
    RunnableLambda,
    RunnableBranch,
)
from agents.base_agent import BaseAgent
from core.error import handle_llm_errors
from core.logging import get_logger
from agents.agents_models import FundamentalAnalystOutput

logger = get_logger(__name__)


def _format_output(x) -> dict:
    if not x:
        return {"analysis": "LLM failed to generate structured output", "summary": {}}
    return x.dict() if hasattr(x, "dict") else x.model_dump()


def _build_messages(data: dict) -> dict:
    """
    Format the input for the Fundamental Analyst stage.
    Combines all relevant financial data into a single message and
    explicitly requests JSON output.
    """

    fund = data.get("fundamental_data", {})

    income = fund.get("income_stmt", {}).get("income_statement", {})
    balance = fund.get("balance_sheet", {}).get("balance_sheet", {})
    cash = fund.get("cash_flow", {}).get("cash_flow", {})
    fundamentals = fund.get("fundamentals", {}).get("fundamentals", {})
    eps_trend = fund.get("eps_trend", {}).get("eps_trend", {})
    valuation = fund.get("valuation", {}).get("valuation", {})
    growth = fund.get("growth", {}).get("growth", {})

    content = f"""
IMPORTANT:
Return ONLY a valid JSON object.
Do not return markdown code fences.
Do not return explanatory text before or after the JSON.

Analyze the financial fundamentals of the company: {data.get("ticker")}

INCOME STATEMENT:
{json.dumps(income, indent=2)}

BALANCE SHEET:
{json.dumps(balance, indent=2)}

CASH FLOW:
{json.dumps(cash, indent=2)}

FUNDAMENTALS:
{json.dumps(fundamentals, indent=2)}

EPS TREND:
{json.dumps(eps_trend, indent=2)}

VALUATION:
{json.dumps(valuation, indent=2)}

GROWTH:
{json.dumps(growth, indent=2)}
"""

    return {"messages": [HumanMessage(content=content.strip())]}


class FundamentalAnalyst(BaseAgent):

    prompt_path = "prompts/fundamental_analyst_prompt.yaml"

    def __init__(self, openrouter_api_key: str = None, thinking_level: str = "low"):
        """Initializes the fundamental analyst with the given prompt and API keys."""
        super().__init__(
            openrouter_api_key=openrouter_api_key,
            thinking_level=thinking_level,
        )

        # Define the success and error chains for the Fundamental Analyst

        success_chain = (
            RunnableLambda(_build_messages)
            | self.prompt
            | self.llm.with_structured_output(FundamentalAnalystOutput)
            | RunnableLambda(_format_output)
        )

        error_chain = RunnableLambda(
            lambda x: f"Failed to fetch fundamental data for "
            f"{x.get('ticker', 'N/A')}: {x.get('fundamental_data', {}).get('error', 'Unknown error')}"
        )

        # Apply branching logic to handle success and failure scenarios based on the presence of fundamental data
        self.chain = RunnableBranch(
            (
                lambda x: (x.get("fundamental_data") or {}).get("status") == "success",
                success_chain,
            ),
            error_chain,
        )

    @handle_llm_errors()
    def run(self, state):
        """Invoke the Fundamental Analyst chain with the relevant portion of the state."""

        logger.info(
            f"Running fundamental analyst pipeline | ticker={state['ticker_of_company']}"
        )
        return self.chain.invoke(
            {
                "ticker": state["ticker_of_company"],
                "fundamental_data": state.get("data_bundle", {}).get(
                    "fundamental_data"
                ),
            }
        )
