/**
 * Institutional Terminology & User-Friendly Vocabulary Humanizer.
 * Translates rigid backend tokens, technical confluence factors, and snake_case field names
 * into polished, accessible, and visually clear financial terminology.
 */

export const TECHNICAL_TERMS_MAP: Record<string, string> = {
  // Fibonacci levels
  "FIB_23_6": "Fibonacci 23.6%",
  "FIB_38_2": "Fibonacci 38.2%",
  "FIB_50_0": "Fibonacci 50% Retracement",
  "FIB_61_8": "Golden Ratio (61.8% Fib)",
  "FIB_78_6": "Fibonacci 78.6% Retracement",
  "FIB_EXT_127_2": "127.2% Fib Extension",
  "FIB_EXT_161_8": "161.8% Fib Expansion",

  // Swing Highs & Lows
  "50D_SWING_HIGH": "50-Day Swing High",
  "20D_SWING_HIGH": "20-Day Swing High",
  "50D_SWING_LOW": "50-Day Swing Low",
  "20D_SWING_LOW": "20-Day Swing Low",

  // Moving Averages
  "SMA_200": "200-Day Major MA",
  "SMA_50": "50-Day MA",
  "SMA_20": "20-Day MA",
  "EMA_200": "200-Day Major EMA",
  "EMA_50": "50-Day EMA",
  "EMA_20": "20-Day EMA",
  "VWMA_20": "20-Day Volume-Weighted MA",
  "VWMA": "Volume-Weighted MA",

  // Price Action & Reactions
  "HISTORICAL_BOUNCE": "Historical Reaction Rebound",
  "UP_SWING": "Upward Swing",
  "DOWN_SWING": "Downward Swing",
  "UPTREND": "Uptrend",
  "DOWNTREND": "Downtrend",
  "SIDEWAYS": "Sideways Consolidation",
  "RANGE_BOUND": "Range-Bound Consolidation",
  "BREAKOUT": "Breakout Trigger",
  "BREAKDOWN": "Breakdown Floor",

  // Strength Contexts
  "HIGH strength": "Strong Confluence",
  "MEDIUM strength": "Moderate Confluence",
  "LOW strength": "Minor Confluence",
  "HIGH_STRENGTH": "Strong Confluence",
  "MEDIUM_STRENGTH": "Moderate Confluence",
  "LOW_STRENGTH": "Minor Confluence",
};

export const FIELD_NAME_MAP: Record<string, string> = {
  // Technical & Price Levels
  "market_structure": "Market Structure",
  "swing_context": "Swing Context",
  "confluence_score": "Confluence Score",
  "confluence_factors": "Technical Signals",
  "price_levels": "Key Price Levels",
  "trend_alignment": "Trend Alignment",
  "golden_cross": "Golden Cross",
  "bullish_cross": "Bullish Crossover",
  "bearish_cross": "Bearish Crossover",
  "bull_divergence": "Bullish Divergence",
  "bear_divergence": "Bearish Divergence",
  "squeeze_active": "Volatility Squeeze",
  "bandwidth_pct": "Bollinger Bandwidth (%)",
  "bandwidth_trend": "Bandwidth Trend",
  "volatility_regime": "Volatility Regime",
  "ratio_5d_20d": "5D/20D Volume Ratio",
  "volume_surge": "Volume Surge",
  "pct_from_52w_high": "% From 52W High",
  "pct_from_52w_low": "% From 52W Low",
  "high_52w": "52-Week High",
  "low_52w": "52-Week Low",
  "support_1": "Primary Support (S1)",
  "support_2": "Capitulation Support (S2)",
  "resistance_1": "Primary Target (R1)",
  "resistance_2": "Extended Target (R2)",
  "rsi_condition": "RSI Momentum State",
  "mfi_condition": "Money Flow State",

  // Fundamental Valuation & Ratios
  "pe_ratio": "P/E Ratio",
  "forward_pe": "Forward P/E",
  "peg_ratio": "PEG Ratio",
  "price_to_book": "Price to Book (P/B)",
  "ev_ebitda": "EV / EBITDA",
  "dividend_yield_pct": "Dividend Yield (%)",
  "promoter_holding_pct": "Promoter Holding (%)",
  "market_cap": "Market Capitalization",
  "revenue_growth": "Revenue Growth (YoY)",
  "net_profit_margin": "Net Profit Margin (%)",
  "operating_margin": "Operating Margin (%)",
  "return_on_equity": "Return on Equity (ROE)",
  "return_on_capital": "Return on Capital (ROCE)",
  "debt_to_equity": "Debt to Equity Ratio",
  "current_ratio": "Current Ratio",
  "quick_ratio": "Quick Ratio",
  "interest_coverage": "Interest Coverage Ratio",
  "free_cash_flow": "Free Cash Flow",
  "altman_z_score": "Altman Z-Score",
  "piotroski_score": "Piotroski F-Score",

  // Sector & Industry
  "industry_trends": "Industry Trends",
  "competitive_dynamics": "Competitive Dynamics",
  "macro_environment": "Macroeconomic Outlook",
  "regulatory_headwinds": "Regulatory & Policy Landscape",
  "growth_drivers": "Key Growth Drivers",
  "peer_comparison": "Peer Group Comparison",
  "swot_analysis": "Strategic SWOT Analysis",
};

// Words to recognize and give special visual treatment (badges/tags)
export const STRONG_CONFLUENCE_LABEL = "Strong Confluence";
export const MODERATE_CONFLUENCE_LABEL = "Moderate Confluence";
export const MINOR_CONFLUENCE_LABEL = "Minor Confluence";

/**
 * Transforms narrative text by replacing rigid technical terms,
 * raw codes, and enum tokens with human-friendly phrases.
 */
export function humanizeText(text: string): string {
  if (!text) return "";

  let result = text;

  // First pass: replace compound phrases like "HIGH strength", "MEDIUM strength", "LOW strength"
  result = result
    .replace(/\bHIGH\s+strength\b/gi, STRONG_CONFLUENCE_LABEL)
    .replace(/\bMEDIUM\s+strength\b/gi, MODERATE_CONFLUENCE_LABEL)
    .replace(/\bLOW\s+strength\b/gi, MINOR_CONFLUENCE_LABEL);

  // Second pass: technical terms with explicit dictionary entries
  // Sort keys by length descending to prevent sub-string collision (e.g. 50D_SWING_HIGH before SWING_HIGH)
  const sortedKeys = Object.keys(TECHNICAL_TERMS_MAP).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const replacement = TECHNICAL_TERMS_MAP[key];
    const regex = new RegExp(`\\b${key}\\b`, "g");
    result = result.replace(regex, replacement);
  }

  // Handle standalone uppercase strength words inside parentheses like "(HIGH, Score 2.7"
  result = result.replace(/\((HIGH),\s*Score/g, `(${STRONG_CONFLUENCE_LABEL}, Score`);
  result = result.replace(/\((MEDIUM),\s*Score/g, `(${MODERATE_CONFLUENCE_LABEL}, Score`);
  result = result.replace(/\((LOW),\s*Score/g, `(${MINOR_CONFLUENCE_LABEL}, Score`);

  return result;
}

/**
 * Transforms a single field name or key (e.g., from an API payload or table column)
 * into a clean, human-readable Title Case label.
 */
export function humanizeFieldName(fieldName: string): string {
  if (!fieldName) return "";

  // Check explicit mapping first
  const cleanKey = fieldName.trim().toLowerCase();
  if (FIELD_NAME_MAP[cleanKey]) {
    return FIELD_NAME_MAP[cleanKey];
  }

  // Convert snake_case or camelCase to Title Case
  return fieldName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

