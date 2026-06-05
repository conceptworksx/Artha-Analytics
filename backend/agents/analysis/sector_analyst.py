import json

from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnableBranch

from agents.base_agent import BaseAgent, load_structured_prompt
from core.constants import get_sector_catalog
from core.error import handle_llm_errors
from core.logging import get_logger
from tools.sector_tools import (
    fetch_sector_payload,
    parse_sector_resolver_output,
)

logger = get_logger(__name__)


def _build_sector_resolver_message(data: dict) -> dict:
    """
    Format the input for the Sector Resolver stage.
    Uses Markdown headers to help the LLM distinguish between raw ticker data,
    yfinance metadata, and the target sector catalog.
    """
    content = f"""
Ticker
{data.get("ticker")}

Company Sector Data (Source: yfinance)
{json.dumps(data.get("company_sector", ""), indent=2)}

Supported Sector Catalog
{json.dumps(data.get("sector_catalog", ""), indent=2)}
"""

    return {"resolver_input": content}



class SectorAnalyst(BaseAgent):
    """
    Agent responsible for identifying a company's sector and analyzing
    the corresponding industry report.
    """

    prompt_path = "prompts/sector_resolver_prompt.yaml"

    def __init__(self, groq_api_key: str):


        super().__init__(groq_api_key)

        resolver_yaml = load_structured_prompt("prompts/sector_resolver_prompt.yaml")
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", resolver_yaml),
                ("user", "{resolver_input}"),
            ]
        )

        # Step 1: Define the LLM-based sector resolver chain
        self.sector_resolver_llm_chain = (
            RunnableLambda(lambda x: _build_sector_resolver_message(x))
            | self.prompt
            | self.llm
            | StrOutputParser()
            | RunnableLambda(parse_sector_resolver_output)
        )


        # This keeps the original data (ticker, sector) while adding the 'resolved_sector' result
        sector_resolver = RunnableParallel(
            {
                "ticker": RunnableLambda(lambda x: x["ticker"]),
                "company_sector": RunnableLambda(lambda x: x["company_sector"]),
                "resolved_sector": self.sector_resolver_llm_chain,
            }
        )

        # Loads rough sector info from yfinance and the supported catalog constants
        sector_fetcher = RunnableParallel(
            {
                "ticker": RunnableLambda(lambda x: x.get("ticker")),
                "company_sector": RunnableLambda(lambda x: x.get("sector_data", {})),
                "sector_catalog": RunnableLambda(lambda _: get_sector_catalog()),
            }
        )

        # Fetches the actual PDF payload and runs the final sector analysis prompt
        report_generator = RunnableLambda(fetch_sector_payload) | RunnableBranch(
            (
                lambda x: x["sector_data"]["status"] == "failed",
                RunnableLambda(
                    lambda x: f"Sector analysis aborted: {x['sector_data'].get('error', 'Sector PDF fetch failed')}"
                ),
            ),
            RunnableLambda(lambda x: x["sector_data"]["data"]),
        )
        
        # Main Pipeline: Fetch -> Resolve -> Analyze
        # If yfinance metadata fetch fails, we short-circuit the chain and return an error.

        self.chain = sector_fetcher | RunnableBranch(
            (
                lambda x: x["company_sector"]["status"] == "failed",
                RunnableLambda(
                    lambda x: f"Sector analysis aborted: Ticker '{x['ticker']}' not found or metadata unavailable. Error: {x['company_sector'].get('error', 'Unknown error')}"
                ),
            ),
            sector_resolver | report_generator,
        )
    @handle_llm_errors()
    def run(self, state) -> str:
        """Execute the full sector analysis pipeline for a given ticker."""
        logger.info(
            f"Running sector analyst pipeline | ticker={state['ticker_of_company']}"
        )
        return self.chain.invoke(
            {
                "ticker": state["ticker_of_company"],
                "sector_data": state.get("data_bundle", {}).get("sector_data"),
            }
        )
