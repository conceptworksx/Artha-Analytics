import yaml
from pathlib import Path
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from config.settings import get_openrouter_llm


def load_structured_prompt(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Prompt file missing at {file_path}")
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    return yaml.dump(data, sort_keys=False, allow_unicode=True)


class BaseAgent:

    prompt_path: str = ""

    def __init__(self, openrouter_api_key: str = None, **llm_kwargs):
        self.llm = get_openrouter_llm(
            api_key=openrouter_api_key, agent_name=self.__class__.__name__, **llm_kwargs
        )

        yaml_instructions = load_structured_prompt(self.prompt_path)

        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", yaml_instructions),
                MessagesPlaceholder(variable_name="messages"),
            ]
        )

    def run(self, *args, **kwargs):
        raise NotImplementedError(f"{self.__class__.__name__} must implement run()")

    @staticmethod
    def _format_summaries(state: dict) -> str:
        """
        Format all 5 analyst summaries from state into a readable evidence block.
        Called directly by Bull/Bear researchers — no _unpack_debate needed.
        """
        analysts = ["market", "fundamental", "technical", "news", "sector"]
        sections = []
        for analyst in analysts:
            data = state.get(f"{analyst}_analyst_summary", {})
            if not data:
                continue

            section = f"=== {analyst.upper()} ANALYST ==="

            # If data is a string (e.g., from an LLM parsing fallback), try to parse it or handle as raw text
            if isinstance(data, str):
                import json

                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    section += f"\nRaw Output: {data}"
                    sections.append(section)
                    continue

            section += f"\nSentiment: {data.get('sentiment', 'N/A')}"
            section += f"\nKey Driver: {data.get('key_driver', 'N/A')}"
            section += f"\nPrimary Risk: {data.get('primary_risk', 'N/A')}"
            for label, key in [
                ("Bull Signals", "bull_signals"),
                ("Bear Signals", "bear_signals"),
            ]:
                signals = data.get(key, [])[:3]  # Top 3 only
                if signals:
                    section += f"\n{label}:"
                    for s in signals:
                        display = (
                            s.get("statement", str(s))
                            if analyst == "sector" and isinstance(s, dict)
                            else s
                        )
                        section += f"\n  • {display}"
            sections.append(section)
        return "\n\n".join(sections) if sections else "No analyst summaries available."
