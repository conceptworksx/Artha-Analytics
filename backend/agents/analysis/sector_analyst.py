import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnableBranch
from agents.base_agent import BaseAgent, load_structured_prompt
from core.constants import get_sector_catalog
from core.error import handle_llm_errors
from core.logging import get_logger
from tools.sector_tools import validate_sector, get_sector_content
from agents.agents_models import SectorResolverOutput

logger = get_logger(__name__)


def _format_output(x) -> dict:
    if not x:
        return {
            "sector_name": None,
            "confidence": 0.0,
            "reason": "LLM failed to generate structured output",
        }
    return x.dict() if hasattr(x, "dict") else x.model_dump()


def _build_sector_resolver_message(data: dict) -> dict:
    content = f"""
Ticker
{data.get("ticker")}

Company Sector Data (Source: yfinance)
{json.dumps(data.get("company_sector", {}), indent=2)}

Supported Sector Catalog
{json.dumps(data.get("sector_catalog", {}), indent=2)}
"""
    return {"resolver_input": content.strip()}


class SectorAnalyst(BaseAgent):
    prompt_path = "prompts/sector_resolver_prompt.yaml"

    def __init__(self, openrouter_api_key: str = None, thinking_level: str = "low"):
        super().__init__(
            openrouter_api_key=openrouter_api_key, thinking_level=thinking_level
        )

        resolver_yaml = load_structured_prompt("prompts/sector_resolver_prompt.yaml")
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", resolver_yaml),
                ("user", "{resolver_input}"),
            ]
        )

        self.sector_resolver_llm_chain = (
            RunnableLambda(_build_sector_resolver_message)
            | self.prompt
            | self.llm.with_structured_output(SectorResolverOutput)
            | RunnableLambda(_format_output)
            | RunnableBranch(
                (
                    lambda x: not x.get("sector_name"),
                    RunnableLambda(
                        lambda x: {
                            "status": "failed",
                            "sector_name": None,
                            "error": "LLM returned JSON but sector_name is missing",
                        }
                    ),
                ),
                RunnableLambda(lambda x: validate_sector(x["sector_name"])),
            )
        )

        # Parallel passthrough
        sector_resolver = RunnableParallel(
            {
                "ticker": RunnableLambda(lambda x: x["ticker"]),
                "company_sector": RunnableLambda(lambda x: x["company_sector"]),
                "resolved_sector": self.sector_resolver_llm_chain,
            }
        )

        # yfinance metadata + catalog
        sector_fetcher = RunnableParallel(
            {
                "ticker": RunnableLambda(lambda x: x.get("ticker")),
                "company_sector": RunnableLambda(lambda x: x.get("sector_data", {})),
                "sector_catalog": RunnableLambda(lambda _: get_sector_catalog()),
            }
        )

        # Main Pipeline
        self.chain = sector_fetcher | RunnableBranch(
            (
                # Branch 1: yfinance fetch failed
                lambda x: isinstance(x.get("company_sector"), dict)
                and x["company_sector"].get("status") == "failed",
                RunnableLambda(
                    lambda x: {
                        "report": None,
                        "summary": None,
                        "error": f"Ticker '{x['ticker']}' not found. "
                        f"Error: {x['company_sector'].get('error', 'Unknown error')}",
                    }
                ),
            ),
            sector_resolver
            | RunnableBranch(
                (
                    # Branch 2: resolution or validation failed
                    lambda x: x["resolved_sector"]["status"] == "failed",
                    RunnableLambda(
                        lambda x: {
                            "report": None,
                            "summary": None,
                            "error": x["resolved_sector"].get(
                                "error", "Sector resolution failed"
                            ),
                        }
                    ),
                ),
                # Default: get_sector_content directly
                RunnableLambda(
                    lambda x: get_sector_content(x["resolved_sector"]["sector_name"])
                )
                | RunnableBranch(
                    (
                        # Branch 3: MongoDB fetch failed
                        lambda x: x["status"] == "failed",
                        RunnableLambda(
                            lambda x: {
                                "report": None,
                                "summary": None,
                                "error": x.get("error", "Sector data unavailable"),
                            }
                        ),
                    ),
                    # Default: success
                    RunnableLambda(
                        lambda x: {
                            "report": x["report"],
                            "summary": x["summary"],
                            "error": None,
                        }
                    ),
                ),
            ),
        )

    @handle_llm_errors()
    def run(self, state) -> dict:
        logger.info(
            f"Running sector analyst pipeline | ticker={state['ticker_of_company']}"
        )
        return self.chain.invoke(
            {
                "ticker": state["ticker_of_company"],
                "sector_data": state.get("data_bundle", {}).get("sector_data"),
            }
        )
