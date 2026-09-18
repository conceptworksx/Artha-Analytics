from typing import Any, Dict
from core.logging import get_logger

logger = get_logger(__name__)


FACTOR_DISPLAY_NAMES = {
    "50D_SWING_LOW": "50D Swing Low",
    "50D_SWING_HIGH": "50D Swing High",
    "20D_SWING_LOW": "20D Swing Low",
    "20D_SWING_HIGH": "20D Swing High",
    "FIB_23_6": "23.6% Fib",
    "FIB_38_2": "38.2% Fib",
    "FIB_50_0": "50.0% Fib",
    "FIB_61_8": "61.8% Fib",
    "FIB_78_6": "78.6% Fib",
    "FIB_EXT_127_2": "127.2% Fib Ext",
    "FIB_EXT_161_8": "161.8% Fib Ext",
    "SMA_20": "20-DMA",
    "SMA_50": "50-DMA",
    "SMA_200": "200-DMA",
    "HISTORICAL_BOUNCE": "Price Bounce",
}

STRENGTH_LABELS = {
    "HIGH": "Strong",
    "MEDIUM": "Moderate",
    "LOW": "Minor",
}


def _format_factors(factors: list[str]) -> str:
    return ", ".join(FACTOR_DISPLAY_NAMES.get(f, f) for f in factors[:3])


def extract_ground_truth_benchmarks(state: dict) -> str:
    """
    Extract a concise, factual anchor of real market price, support/resistance levels,
    and core valuation metrics from state to prevent hallucinated prices.
    """
    bundle = state.get("data_bundle") or {}
    tech = state.get("technical_data") or bundle.get("technical_data") or {}
    fund = state.get("fundamental_data") or bundle.get("fundamental_data") or {}
    info = state.get("company_info") or bundle.get("company_info") or {}

    price_levels = tech.get("price_levels") or {}
    rsi_data = tech.get("rsi") or {}
    ma_data = tech.get("moving_averages") or {}
    atr_data = tech.get("atr") or {}

    # 1. Real stock price
    cmp_val = (
        price_levels.get("current")
        or info.get("currentPrice")
        or info.get("regularMarketPrice")
        or "N/A"
    )
    currency = info.get("currency") or "INR"
    curr_symbol = "₹" if currency == "INR" else f"{currency} "

    lines = [
        "=== VERIFIED MARKET BENCHMARKS (FACTUAL GROUND-TRUTH) ===",
        f"• Current Market Price (CMP): {curr_symbol}{cmp_val}",
    ]

    # 2. Key technical levels & price boundaries
    if price_levels:
        s1 = price_levels.get("support_1")
        s2 = price_levels.get("support_2")
        r1 = price_levels.get("resistance_1")
        r2 = price_levels.get("resistance_2")
        h52 = price_levels.get("high_52w") or info.get("fiftyTwoWeekHigh")
        l52 = price_levels.get("low_52w") or info.get("fiftyTwoWeekLow")
        m_struct = price_levels.get("market_structure") or "RANGE"

        supports_list = price_levels.get("supports") or []
        resistances_list = price_levels.get("resistances") or []

        s1_detail = f"{s1}" if s1 is not None else "None"
        if supports_list and len(supports_list) > 0 and s1 is not None:
            top_s = supports_list[0]
            factors_str = _format_factors(top_s.get("confluence_factors", []))
            zone_obj = top_s.get("zone", {})
            strength = STRENGTH_LABELS.get(
                top_s.get("strength", ""), top_s.get("strength", "N/A")
            )
            score = top_s.get("confluence_score", "N/A")
            z_str = (
                f" [Zone: {curr_symbol}{zone_obj.get('low')}–{curr_symbol}{zone_obj.get('high')}]"
                if zone_obj
                else ""
            )
            s1_detail = (
                f"{s1} ({strength} Support, Score {score}: {factors_str}){z_str}"
            )

        r1_detail = f"{r1}" if r1 is not None else "None"
        if resistances_list and len(resistances_list) > 0 and r1 is not None:
            top_r = resistances_list[0]
            factors_str = _format_factors(top_r.get("confluence_factors", []))
            zone_obj = top_r.get("zone", {})
            strength = STRENGTH_LABELS.get(
                top_r.get("strength", ""), top_r.get("strength", "N/A")
            )
            score = top_r.get("confluence_score", "N/A")
            z_str = (
                f" [Zone: {curr_symbol}{zone_obj.get('low')}–{curr_symbol}{zone_obj.get('high')}]"
                if zone_obj
                else ""
            )
            r1_detail = (
                f"{r1} ({strength} Resistance, Score {score}: {factors_str}){z_str}"
            )

        s2_str = f"{s2}" if s2 is not None else "None"
        r2_str = f"{r2}" if r2 is not None else "None"

        lines.append(
            f"• Technical Price Levels: Support [S1: {s1_detail}, S2: {s2_str}] | Resistance [R1: {r1_detail}, R2: {r2_str}] | Market Structure: {m_struct}"
        )

        if h52 or l52:
            lines.append(
                f"• 52-Week Range: Low: {curr_symbol}{l52} | High: {curr_symbol}{h52}"
            )

    # 3. Technical Momentum & Trend Indicators
    tech_indicators = []
    if rsi_data:
        rsi_curr = rsi_data.get("current") or rsi_data.get("value")
        if rsi_curr is not None:
            tech_indicators.append(f"RSI(14): {rsi_curr}")
    if atr_data:
        atr_val = atr_data.get("current") or atr_data.get("atr")
        if atr_val is not None:
            tech_indicators.append(f"ATR: {atr_val}")
    if ma_data:
        sma_50 = ma_data.get("sma_50") or ma_data.get("SMA_50")
        sma_200 = ma_data.get("sma_200") or ma_data.get("SMA_200")
        if sma_50 is not None:
            tech_indicators.append(f"50-DMA: {sma_50}")
        if sma_200 is not None:
            tech_indicators.append(f"200-DMA: {sma_200}")

    if tech_indicators:
        lines.append(f"• Technical Indicators: {' | '.join(tech_indicators)}")

    # 4. Core fundamental valuation & leverage
    valuation = fund.get("valuation") or {}
    health = fund.get("fundamentals") or {}

    pe = (
        valuation.get("trailing_pe")
        or valuation.get("pe_ratio")
        or fund.get("pe_ratio")
        or info.get("trailingPE")
    )
    pb = (
        valuation.get("price_to_book")
        or valuation.get("pb_ratio")
        or fund.get("pb_ratio")
    )
    de = (
        health.get("debt_to_equity")
        or fund.get("debt_to_equity")
        or info.get("debtToEquity")
    )
    roce = health.get("roce") or fund.get("roce")
    roe = health.get("roe") or fund.get("roe")
    raw_mkt_cap = valuation.get("market_cap") or info.get("marketCap")
    mkt_cap = None
    if raw_mkt_cap is not None:
        if isinstance(raw_mkt_cap, (int, float)):
            if currency == "INR":
                mkt_cap = f"₹ {raw_mkt_cap / 1e7:,.2f} Cr"
            else:
                mkt_cap = f"{curr_symbol}{raw_mkt_cap:,.2f}"
        elif isinstance(raw_mkt_cap, str):
            if any(sym in raw_mkt_cap for sym in ["₹", "INR", "$", "Cr"]):
                mkt_cap = raw_mkt_cap
            else:
                try:
                    num = float(raw_mkt_cap)
                    if currency == "INR":
                        mkt_cap = f"₹ {num / 1e7:,.2f} Cr"
                    else:
                        mkt_cap = f"{curr_symbol}{num:,.2f}"
                except (ValueError, TypeError):
                    mkt_cap = (
                        f"₹ {raw_mkt_cap}"
                        if currency == "INR"
                        else f"{curr_symbol}{raw_mkt_cap}"
                    )

    fund_indicators = []
    if pe is not None:
        fund_indicators.append(f"P/E: {pe}")
    if pb is not None:
        fund_indicators.append(f"P/B: {pb}")
    if de is not None:
        fund_indicators.append(f"D/E: {de}")
    if roce is not None:
        fund_indicators.append(f"ROCE: {roce}%")
    if roe is not None:
        fund_indicators.append(f"ROE: {roe}%")
    if mkt_cap is not None:
        fund_indicators.append(f"Market Cap: {mkt_cap}")

    if fund_indicators:
        lines.append(f"• Fundamental Benchmarks: {' | '.join(fund_indicators)}")

    lines.append(
        "* MANDATORY CONSTRAINT: Derive your trade parameters (entry_price, exit_price, stop_loss) "
        "directly from these verified numbers. Do NOT invent prices that deviate from the CMP and key levels."
    )

    return "\n".join(lines)
