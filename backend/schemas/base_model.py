from pydantic import BaseModel, Field
from typing import Literal, List

class Signal(BaseModel):
    statement: str = Field(
        description=(
            "An evidence-backed signal or observation. MUST combine a quantitative multi-year "
            "trend/delta directly with its operational impact inside a single statement. "
            "Do NOT use vague phrases like 'strong growth' or 'increasing liabilities'."
        )
    )
    strength: int = Field(
        ge=1,
        le=10,
        description="Relative importance/strength of the signal from 1-10"
    )

class AnalystSummary(BaseModel):
    sentiment: Literal[
        "strongly_positive",
        "positive",
        "neutral",
        "negative",
        "strongly_negative",
    ] = Field(description="Overall assessment derived from all evidence")

    key_driver: str = Field(
        description=(
            "The single strongest bullish trend or operational milestone. "
            "CRITICAL: Do NOT start with introductory phrases like 'The company's', 'The key driver is', or 'Based on'. "
            "Start directly with the specific numbers, multi-year changes, or CAGR values."
        )
    )

    primary_risk: str = Field(
        description=(
            "The single strongest core bearish vulnerability or risk vector. "
            "CRITICAL: Do NOT start with introductory phrases like 'The company's', 'The primary risk is', or 'Based on'. "
            "Start directly with the specific numbers, multi-year ratio drops, or balance sheet stress indicators."
        )
    )

    bull_signals: List[Signal] = Field(
        min_length=0,
        max_length=5,
        description="List of 0-5 unique, quantitative bullish signals containing metrics and their business implications."
    )

    bear_signals: List[Signal] = Field(
        min_length=0,
        max_length=5,
        description="List of 0-5 unique, quantitative bearish signals containing metrics and their business implications."
    )

class AgentOutput(BaseModel):
    report : str             = Field(description="Full markdown report for user display")
    summary: AnalystSummary = Field(description="Structured summary for bull/bear debate")