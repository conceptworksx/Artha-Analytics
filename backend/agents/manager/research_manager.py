import json
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from agents.agents_models import Verdict
from config.settings import get_openrouter_llm


class ResearchManager:

    def __init__(self, openrouter_api_key: str = None, thinking_level: str = "low"):
        self.llm = get_openrouter_llm(
            api_key=openrouter_api_key,
            thinking_level=thinking_level,
            agent_name=self.__class__.__name__,
        )
        self.prompt = self._build_prompt()
        self.chain = self.prompt | self.llm.with_structured_output(Verdict)

    def _build_prompt(self) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a senior research manager and the final decision-maker in an "
                    "investment debate. You have reviewed arguments from both a bull and a "
                    "bear analyst, along with evidence from 5 specialist analysts.\n\n"
                    "YOUR TASK:\n"
                    "- Objectively weigh the bull and bear theses against the analyst evidence.\n"
                    "- Identify which side presented stronger, data-backed reasoning.\n"
                    "- Deliver a final verdict: BUY, SELL, or HOLD.\n"
                    "- Provide actionable trade parameters: entry price, exit/target price, "
                    "stop-loss, and recommended hold duration.\n"
                    "- Use the technical analyst's support/resistance levels and current price "
                    "data to derive realistic price targets.\n"
                    "- Assess the strength of each side's argument (strong/moderate/weak).\n"
                    "- List the top 3 catalysts and top 3 risks.\n\n"
                    "PRICE GUIDANCE:\n"
                    "- For BUY: entry_price = near support or current price, exit_price = target, "
                    "stop_loss = below key support.\n"
                    "- For SELL: entry_price = current price (to sell), exit_price = N/A or lower "
                    "re-entry, stop_loss = N/A, hold_duration = 'Exit immediately' or short.\n"
                    "- For HOLD: entry_price = current position, exit_price = target if upside, "
                    "stop_loss = trailing stop, hold_duration = review period.\n\n"
                    "TONE & STYLE:\n"
                    "Be decisive, neutral, and analytical. Avoid being swayed by confidence "
                    "alone — prioritize evidence and risk-adjusted reasoning.",
                ),
                MessagesPlaceholder(variable_name="messages"),
            ]
        )

    def _build_input(self, state: dict) -> dict:
        debate = state.get("investment_debate", {})
        bull_thesis = debate.get("bull_thesis", "No bull thesis provided.")
        bear_thesis = debate.get("bear_thesis", "No bear thesis provided.")

        def _unpack_thesis(thesis_obj) -> str:
            if not isinstance(thesis_obj, dict):
                return str(thesis_obj)
            title = thesis_obj.get("title", "No Title")
            intro = thesis_obj.get("introduction", "")
            args = thesis_obj.get("arguments") or []

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

            return "\n\n".join(parts)

        bull_thesis = _unpack_thesis(bull_thesis)
        bear_thesis = _unpack_thesis(bear_thesis)

        # Extract technical price data for entry/exit guidance
        tech_summary = state.get("technical_analyst_summary", {})
        price_data = ""
        if tech_summary:
            price_data = f"""
TECHNICAL PRICE DATA (for entry/exit/stop-loss guidance):
{json.dumps(tech_summary, indent=2, default=str)}
"""

        content = f"""
Company: {state.get('ticker_of_company', '')} | Sector: {state.get('sector_of_company', 'N/A')}

=== BULL THESIS ===
{bull_thesis}

=== BEAR THESIS ===
{bear_thesis}
{price_data}
Weigh both sides. Deliver your final verdict as BUY, SELL, or HOLD
with clear rationale, actionable trade parameters, and risk assessment.
""".strip()

        return {"messages": [HumanMessage(content=content)]}

    def run(self, state: dict) -> Verdict:
        response = self.chain.invoke(self._build_input(state))
        if response is None:
            return Verdict(
                decision="HOLD",
                confidence=0.0,
                entry_price="N/A",
                exit_price="N/A",
                stop_loss="N/A",
                hold_duration="N/A",
                rationale="Debate failed due to internal reasons",
                strategy="Wait for better data.",
                bull_strength="weak",
                bear_strength="weak",
                key_catalysts=[],
                key_risks=[],
                status="failure",
            )
        return response
