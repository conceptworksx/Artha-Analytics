import json
from langchain_core.messages import HumanMessage
from langchain_core.runnables import (
    RunnableLambda,
    RunnableBranch,
)
from agents.base_agent import BaseAgent
from core.error import handle_llm_errors
from core.logging import get_logger
from agents.agents_models import TechnicalAnalystOutput

logger = get_logger(__name__)


def _format_output(x) -> dict:
    if not x:
        return {"analysis": "LLM failed to generate structured output", "summary": {}}
    return x.dict() if hasattr(x, "dict") else x.model_dump()


def _build_messages(data: dict) -> dict:
    """
    Format the input for the Technical Analyst stage.
    Combines all relevant technical data into a single message.
    """

    tech = data.get("technical_data", {})

    content = f"""
IMPORTANT:
Return ONLY a valid JSON object.
Do not include markdown, explanations, or any extra text.
The output must strictly follow JSON format.

Analyze the technical data for the company {data.get('ticker')}:

Relative Strength Index:
{json.dumps(tech.get('rsi', {}), indent=2)}

Moving Average Convergence Divergence:
{json.dumps(tech.get('macd', {}), indent=2)}

Average True Range:
{json.dumps(tech.get('atr', {}), indent=2)}

Volume Weighted Moving Average:
{json.dumps(tech.get('vwma', {}), indent=2)}

Money Flow Index:
{json.dumps(tech.get('mfi', {}), indent=2)}

Bollinger Bands:
{json.dumps(tech.get('bollinger', {}), indent=2)}

Moving Averages:
{json.dumps(tech.get('moving_averages', {}), indent=2)}

Trading Volume:
{json.dumps(tech.get('volume', {}), indent=2)}

Support and Resistance Levels:
{json.dumps(tech.get('price_levels', {}), indent=2)}
"""

    return {"messages": [HumanMessage(content=content.strip())]}


class TechnicalAnalyst(BaseAgent):

    prompt_path = "prompts/technical_analyst_prompt.yaml"

    def __init__(self, openrouter_api_key: str = None, thinking_level: str = "low"):
        super().__init__(
            openrouter_api_key=openrouter_api_key,
            thinking_level=thinking_level,
        )

        # Define the success and error chains for the Technical Analyst
        success_chain = (
            RunnableLambda(_build_messages)
            | self.prompt
            | self.llm.with_structured_output(TechnicalAnalystOutput)
            | RunnableLambda(_format_output)
        )
        error_chain = RunnableLambda(
            lambda x: f"Failed to fetch fundamental data for "
            f"{x.get('ticker', 'N/A')}: {x.get('error', 'Unknown error')}"
        )

        # Apply a branching logic to handle cases where technical data is successfully fetched vs when it fails
        self.chain = RunnableBranch(
            (
                lambda x: x.get("technical_data", {}).get("status") == "success",
                success_chain,
            ),
            error_chain,
        )

    @handle_llm_errors()
    def run(self, state):
        """Invoke the Technical Analyst chain with the relevant portion of the state."""

        logger.info(
            f"Running technical analyst pipeline | ticker={state['ticker_of_company']}"
        )

        return self.chain.invoke(
            {
                "ticker": state["ticker_of_company"],
                "technical_data": state.get("data_bundle", {}).get("technical_data"),
            }
        )
