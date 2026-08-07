from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from config.settings import get_openrouter_llm
from agents.base_agent import BaseAgent
from agents.agents_models import ThesisOutput


class BearResearcher:

    def __init__(self, openrouter_api_key: str = None, thinking_level: str = "low"):
        self.llm = get_openrouter_llm(
            api_key=openrouter_api_key,
            thinking_level=thinking_level,
            agent_name=self.__class__.__name__,
        )
        self.prompt = self._build_prompt()
        self.chain = self.prompt | self.llm.with_structured_output(ThesisOutput)

    def _build_prompt(self) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a professional bearish equity analyst. Your goal is to dismantle "
                    "the investment case for a given stock. Maintain a skeptical, sharp, and "
                    "conversational tone, directly challenging bullish assumptions.\n\n"
                    "Focus on the following pillars in your analysis:\n"
                    "1. RISKS & CHALLENGES: Identify market saturation, financial instability, "
                    "or macroeconomic headwinds.\n"
                    "2. COMPETITIVE WEAKNESSES: Highlight declining innovation, eroding moats, "
                    "or superior rival positioning.\n"
                    "3. NEGATIVE INDICATORS: Support your claims with specific financial data, "
                    "technical trends, sector decline impact, or recent adverse news.\n"
                    "4. BULL COUNTERPOINTS: Critically analyze and expose over-optimistic "
                    "assumptions in the bullish thesis with sound reasoning.\n\n"
                    "Strategy: Don't just list facts. Engage in a debate, address the bull's "
                    "points directly, and emphasize potential downsides.\n"
                    "Keep explanations highly concise and to the point. Do not deep dive or elaborate excessively.\n\n"
                    "IMPORTANT:\n"
                    "You must output ONLY a valid JSON object matching the requested schema. "
                    "Do not include any other text or markdown formatting.",
                ),
                MessagesPlaceholder(variable_name="messages"),
            ]
        )

    def _build_input(self, state: dict) -> dict:
        evidence = BaseAgent._format_summaries(state)
        debate = state.get("investment_debate", {})
        bull_thesis = debate.get("bull_thesis", "")

        bull_section = ""
        if bull_thesis:
            if isinstance(bull_thesis, dict):
                title = bull_thesis.get("title", "No Title")
                intro = bull_thesis.get("introduction", "")
                args = bull_thesis.get("arguments") or []

                parts = [f"TITLE: {title}"]
                if intro:
                    parts.append(f"INTRODUCTION:\n{intro}")

                for idx, arg in enumerate(args, 1):
                    if not isinstance(arg, dict):
                        continue
                    heading = arg.get("heading", "Argument")
                    details_list = arg.get("details") or []
                    details = "\n  - ".join(str(d) for d in details_list)
                    parts.append(f"ARGUMENT {idx}: {heading}\n  - {details}")

                bull_thesis_str = "\n\n".join(parts)
            else:
                bull_thesis_str = str(bull_thesis)
            bull_section = f"\nBull Thesis to Rebut:\n{bull_thesis_str}"

        content = f"""
Company: {state.get('ticker_of_company', '')} | Sector: {state.get('sector_of_company', 'N/A')}

ANALYST EVIDENCE:
{evidence}
{bull_section}

Task:
Build the strongest possible bear thesis.
Directly rebut the bull argument above using the analyst evidence.
""".strip()

        return {"messages": [HumanMessage(content=content)]}

    def run(self, state: dict) -> dict:
        response = self.chain.invoke(self._build_input(state))
        if response is None:
            return {
                "title": "Parsing Error",
                "introduction": "Debate failed due to internal reasons",
                "arguments": [],
                "status": "failure",
            }
        return response.model_dump()
