from typing import Literal, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Fundamental Analyst Models
# ---------------------------------------------------------
class FundamentalAnalysis(BaseModel):
    revenue_and_growth: str = Field(
        description="Detailed paragraph explaining revenue trends, demand strength, and operational leverage indicators"
    )
    profitability: str = Field(
        description="Detailed paragraph breaking down operating margins, cost vectors, and per-share earnings quality"
    )
    capital_structure_and_solvency: str = Field(
        description="Detailed paragraph tracking long-term structural liabilities and balance sheet safety parameters"
    )
    cash_flow_and_liquidity: str = Field(
        description="Detailed paragraph analyzing cash conversion cycles, capital spending efficiency, and runway stability"
    )
    return_ratios: str = Field(
        description="Detailed paragraph assessing management's structural asset efficiency and reinvestment performance"
    )
    valuation_and_ownership: str = Field(
        description="Detailed paragraph mapping current market multiples against underlying growth realities and governance safety"
    )


class FundamentalSummary(BaseModel):
    sentiment: Literal[
        "strongly_positive", "positive", "neutral", "negative", "strongly_negative"
    ]
    key_driver: str = Field(
        description="Main quantitative factor driving the company story forward (Strictly 1–2 lines, no introductory filler)."
    )
    primary_risk: str = Field(
        description="Main operational or systemic risk affecting downside potential (Strictly 1–2 lines, no introductory filler)."
    )
    bull_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed bullish insight matching the formula: [Quantitative Base Metric] + [Multi-Year Change/CAGR delta to Target Year] + [Operational Financial 'Why'].",
    )
    bear_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed bearish warning matching the formula: [Quantitative Base Metric] + [Multi-Year Change/Ratio breakdown to Target Year] + [Risk/Solvency Impact 'Why'].",
    )


class FundamentalAnalystOutput(BaseModel):
    analysis: FundamentalAnalysis
    summary: FundamentalSummary


# ---------------------------------------------------------
# Market Analyst Models
# ---------------------------------------------------------
class MarketAnalysis(BaseModel):
    regime: str = Field(
        description="Detailed summary classifying the global and domestic market regime based on cross-market evidence. Must be 5-7 lines of impactful analysis explaining the real-world outcome and what it symbolizes."
    )
    us_indices: str = Field(
        description="Deep analysis of US indices momentum and structural trends. Do not just list data; explain the macroeconomic impact and what this signifies for global liquidity. Must be 5-7 lines."
    )
    indian_indices: str = Field(
        description="Deep analysis of Indian indices momentum and structural trends. Explain the domestic economic impact and what it symbolizes for domestic growth. Must be 5-7 lines."
    )
    correlation: str = Field(
        description="Detailed analysis of alignment between US and Indian indices. Explain the real-world outcome of this correlation (e.g., decoupling vs. dependency). Must be 5-7 lines."
    )
    momentum: str = Field(
        description="Deep-dive momentum analysis interpreting trend continuation or bounce-backs. Explain the broader outcome of these momentum shifts. Must be 5-7 lines."
    )
    volatility: str = Field(
        description="Detailed interpretation of the VIX. Analyze risk appetite and what this level of fear/greed symbolizes for institutional positioning. Must be 5-7 lines."
    )
    outlook: str = Field(
        description="Data-driven assessment of the current market environment and key parameters to monitor for regime changes. Explain the real-world impact. Must be 5-7 lines."
    )


class MarketSummary(BaseModel):
    sentiment: Literal[
        "strongly_positive", "positive", "neutral", "negative", "strongly_negative"
    ]
    key_driver: str = Field(
        description="The single most impactful macro/momentum trend extracted directly from the summary payload (Strictly 1–2 lines, no introductory filler)."
    )
    primary_risk: str = Field(
        description="The single most impactful risk trend or volatility shock extracted directly from the summary payload (Strictly 1–2 lines, no introductory filler)."
    )
    bull_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed macro observation matching the formula: [FULL_INDEX_NAME] + [Specific Metric & Value] + [Macro Mechanism & Long-term Trajectory].",
    )
    bear_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed risk observation matching the formula: [FULL_INDEX_NAME] + [Specific Shock/Drawdown Metric & Value] + [Systemic Vulnerability/Downside Impact].",
    )


class MarketAnalystOutput(BaseModel):
    analysis: MarketAnalysis
    summary: MarketSummary


# ---------------------------------------------------------
# News Analyst Models
# ---------------------------------------------------------
class NewsAnalysis(BaseModel):
    company_short_term: str = Field(
        description="Analysis of immediate price reaction, volume response, and order-book sentiment based on company-specific events."
    )
    company_long_term: str = Field(
        description="Structural changes to business fundamentals, earnings capacity, or corporate governance based on company-specific events."
    )
    macro_impact: str = Field(
        description="Explicit reasoning detailing the transmission mechanism of Global News on the stock, or state 'No significant impact'."
    )
    indian_impact: str = Field(
        description="Explicit reasoning detailing the transmission mechanism of Indian News on the stock, or state 'No significant impact'."
    )
    cross_market: str = Field(
        description="Correlation analysis tracing shifts across currency pairs, sovereign bond yields, and commodity benchmarks derived from the news data."
    )
    risks: str = Field(
        description="Potential downside triggers, regulatory friction, or macro headwinds tied to specific dates and data points."
    )
    opportunities: str = Field(
        description="Potential upside catalysts, structural tailwinds, or microeconomic expansions tied to specific dates and data points."
    )


class NewsSummary(BaseModel):
    sentiment: Literal[
        "strongly_positive", "positive", "neutral", "negative", "strongly_negative"
    ]
    key_driver: str = Field(
        description="The single most impactful positive news event or structural catalyst extracted directly from the summary payload (Strictly 1–2 lines, no introductory filler)."
    )
    primary_risk: str = Field(
        description="The single most critical negative news shock, risk trigger, or macroeconomic headwind extracted directly from the summary payload (Strictly 1–2 lines, no introductory filler)."
    )
    bull_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed news observation matching the formula: [Event Name] + [Priority/Date Context] + [Operational/Business Upside Transmission Path].",
    )
    bear_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed risk observation matching the formula: [Event Name] + [Priority/Date Context] + [Operational/Financial Downside Impact Floor].",
    )


class NewsAnalystOutput(BaseModel):
    analysis: NewsAnalysis
    summary: NewsSummary


# ---------------------------------------------------------
# Technical Analyst Models
# ---------------------------------------------------------
class TechnicalAnalysis(BaseModel):
    market_structure: str = Field(
        description="Comprehensive paragraph detailing the Moving Average Alignment, Trend Classification, Cross Status, and Price vs VWMA."
    )
    volatility: str = Field(
        description="Detailed analysis of ATR implications, Bollinger Bandwidth, Squeeze status, Percent B, and Band Levels."
    )
    momentum: str = Field(
        description="Analysis of exact RSI values, conditions, momentum trend direction, and divergences."
    )
    macd: str = Field(
        description="Comparison between MACD vs Signal, MACD Bias, and MACD Histogram expansion/contraction."
    )
    volume: str = Field(
        description="Interpretation of MFI value/condition, Volume Ratios, and confirmation of institutional participation."
    )
    price_levels: str = Field(
        description="Explicit details on 52-Week Range, Support & Resistance zones mapped from structural bands and MA lines."
    )


class TechnicalSummary(BaseModel):
    sentiment: Literal[
        "strongly_positive", "positive", "neutral", "negative", "strongly_negative"
    ]
    key_driver: str = Field(
        description="Main dominant bullish technical indicator or breakout signature extracted directly from the summary payload (Strictly 1–2 lines, no introductory filler)."
    )
    primary_risk: str = Field(
        description="Main critical bearish indicator, momentum exhaustion signal, or breakdown vulnerability extracted directly from the summary payload (Strictly 1–2 lines, no introductory filler)."
    )
    bull_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed bullish insight matching the formula: [INDICATOR_NAME] + [Value & Direction Profile] + [Technical Mechanism & Actionable Zone].",
    )
    bear_signals: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Evidence-backed bearish warning matching the formula: [INDICATOR_NAME] + [Value & Distressed Profile] + [Technical Mechanism & Downside Risk Zone].",
    )


class TechnicalAnalystOutput(BaseModel):
    analysis: TechnicalAnalysis
    summary: TechnicalSummary


# ---------------------------------------------------------
# Sector Analyst Models
# ---------------------------------------------------------
class SectorResolverOutput(BaseModel):
    sector_name: str = Field(
        description="The exact sector name from the supported sector catalog"
    )
    confidence: float = Field(description="Confidence score between 0 and 1")
    reason: str = Field(description="Reasoning for the selection")


# ---------------------------------------------------------
# Bull and Bear Models
# ---------------------------------------------------------
class ThesisArgument(BaseModel):
    heading: str = Field(description="The main point or heading of the argument")
    details: list[str] = Field(
        description="List of detailed points and evidence supporting the argument"
    )
    rebuttal: str = Field(
        description="Rebuttal to the opposing side's counterpoint, if applicable",
        default="",
    )


class ThesisOutput(BaseModel):
    title: str = Field(description="A strong, descriptive title for the thesis")
    introduction: str = Field(
        description="An introductory paragraph summarizing the stance"
    )
    arguments: list[ThesisArgument] = Field(
        description="The main arguments supporting the thesis"
    )
    status: str = Field(
        description="Status of the thesis generation ('success' or 'failure')",
        default="success",
    )


# ---------------------------------------------------------
# Research Manager Models
# ---------------------------------------------------------
class Verdict(BaseModel):
    """Structured verdict produced by the Research Manager after evaluating the debate."""

    decision: Literal["BUY", "SELL", "HOLD"]
    confidence: float = Field(
        ge=0.0, le=1.0, description="Confidence level in the decision (0.0–1.0)"
    )
    entry_price: str = Field(
        description="Recommended entry price or range, e.g. '₹4,150–₹4,200'"
    )
    exit_price: str = Field(
        description="Target exit / take-profit price, e.g. '₹4,600'"
    )
    stop_loss: str = Field(description="Stop-loss price level, e.g. '₹3,950'")
    hold_duration: str = Field(
        description="Recommended holding period, e.g. '3–6 months' or 'Exit immediately' for SELL"
    )
    rationale: str = Field(
        description="2–3 sentence decision rationale explaining why one side prevailed"
    )
    strategy: str = Field(
        description="Concise investment strategy based on the decision"
    )
    bull_strength: Literal["strong", "moderate", "weak"] = Field(
        description="Assessment of bull thesis strength"
    )
    bear_strength: Literal["strong", "moderate", "weak"] = Field(
        description="Assessment of bear thesis strength"
    )
    key_catalysts: list[str] = Field(
        max_length=3, description="List of 2-3 key upcoming events or triggers"
    )
    status: Literal["success", "failure"] = Field(
        description="Status of the verdict generation", default="success"
    )
    key_risks: list[str] = Field(max_length=3, description="Top 3 risks to monitor")
