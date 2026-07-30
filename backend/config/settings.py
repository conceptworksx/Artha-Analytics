import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_openrouter import ChatOpenRouter

load_dotenv()

OPEN_ROUTER_MODEL = os.getenv(
    "OPEN_ROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free"
)
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "Trade-Agentic")
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")


def get_llm(api_key: str = None):
    return ChatGroq(
        model=GROQ_MODEL,
        api_key=api_key,
        temperature=0.3,
    )


def get_openrouter_llm(api_key: str = None):

    return ChatOpenRouter(
        model=OPEN_ROUTER_MODEL,
        openrouter_api_key=api_key,
        temperature=0.2,
        top_p=0.9,
        frequency_penalty=0.5,
        presence_penalty=0.1,
        max_completion_tokens=4000,
        reasoning={
            "effort": "none",
        },
    )
