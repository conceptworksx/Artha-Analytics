from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from config.settings import get_openrouter_llm
from agents.base_agent import BaseAgent
from agents.agents_models import ThesisOutput


class BullResearcher:

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
                    "You are a professional bullish equity analyst. Your goal is to build a "
                    "compelling investment case for the stock, emphasizing its upside and resilience.\n\n"
                    "YOUR TASK:\n"
                    "- Identify and articulate exactly 3 strong, distinct reasons why this stock "
                    "is a 'Buy' or 'Outperform'.\n"
                    "- GROWTH POTENTIAL: Highlight market opportunities, revenue scalability, "
                    "and long-term projections.\n"
                    "- COMPETITIVE ADVANTAGES: Showcase unique products, strong branding, "
                    "or a dominant market moat.\n"
                    "- POSITIVE INDICATORS: Support your thesis with strong financial health, "
                    "favorable industry trends, and recent catalysts.\n"
                    "- BEAR COUNTERPOINTS: Address common skeptical arguments directly, using "
                    "data to show why the bear case is overblown or shortsighted.\n\n"
                    "TONE & STYLE:\n"
                    "Be confident, visionary, and persuasive. Engage in a conversational debate "
                    "with the bear analyst, directly countering their pessimism with sound "
                    "reasoning and data-driven optimism.\n"
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
        bear_thesis = debate.get("bear_thesis", "")

        bear_section = ""
        if bear_thesis:
            if isinstance(bear_thesis, dict):
                title = bear_thesis.get("title", "No Title")
                intro = bear_thesis.get("introduction", "")
                args = bear_thesis.get("arguments") or []

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

                bear_thesis_str = "\n\n".join(parts)
            else:
                bear_thesis_str = str(bear_thesis)
            bear_section = f"\nBear Thesis to Rebut:\n{bear_thesis_str}"

        content = f"""
Company: {state.get('ticker_of_company', '')} | Sector: {state.get('sector_of_company', 'N/A')}

ANALYST EVIDENCE:
{evidence}
{bear_section}

Task:
Build the strongest possible bull thesis using the analyst evidence above.
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
