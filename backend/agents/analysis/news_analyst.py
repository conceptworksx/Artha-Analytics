import json
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableParallel, RunnableLambda
from agents.base_agent import BaseAgent
from tools.news_tools import (
    get_indian_market_news,
    get_global_market_news,
)
from core.error import handle_llm_errors
from core.logging import get_logger
from agents.agents_models import NewsAnalystOutput

logger = get_logger(__name__)


def _format_output(x) -> dict:
    if not x:
        return {"analysis": "LLM failed to generate structured output", "summary": {}}
    return x.dict() if hasattr(x, "dict") else x.model_dump()


def _build_messages(data: dict) -> dict:
    """
    Format the input for the News Analyst stage.
    Combines all relevant news data into a single message.
    """

    content = f"""
IMPORTANT:
Return ONLY a valid JSON object.
Do not include markdown, explanations, or any extra text.
The output must strictly follow JSON format.

Analyze the news sentiment for {data['ticker']}.

COMPANY NEWS:
{json.dumps(data.get('company_news', {}), indent=2)}

INDIAN MARKET NEWS:
{json.dumps(data.get('indian_news', {}), indent=2)}

GLOBAL MARKET NEWS:
{json.dumps(data.get('global_news', {}), indent=2)}
"""

    return {"messages": [HumanMessage(content=content.strip())]}


class NewsAnalyst(BaseAgent):

    prompt_path = "prompts/news_analyst_prompt.yaml"

    def __init__(self, openrouter_api_key: str = None, thinking_level: str = "low"):
        super().__init__(
            openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
        )

        # Define a parallel runnable to fetch all relevant news data simultaneously
        news_fetcher = RunnableParallel(
            {
                "ticker": RunnableLambda(lambda x: x["ticker"]),
                "company_news": RunnableLambda(lambda x: x.get("company_news")),
                "indian_news": RunnableLambda(lambda _: get_indian_market_news()),
                "global_news": RunnableLambda(lambda _: get_global_market_news()),
            }
        )

        # Define the chain to process the news data and generate the report
        self.chain = (
            news_fetcher
            | RunnableLambda(_build_messages)
            | self.prompt
            | self.llm.with_structured_output(NewsAnalystOutput)
            | RunnableLambda(_format_output)
        )

    @handle_llm_errors()
    def run(self, state) -> str:
        """Invoke the News Analyst chain with the relevant portion of the state."""

        logger.info(
            f"Running news analyst pipeline | ticker={state['ticker_of_company']}"
        )
        return self.chain.invoke(
            {
                "ticker": state["ticker_of_company"],
                "company_news": state.get("data_bundle", {}).get("news_data"),
            }
        )
