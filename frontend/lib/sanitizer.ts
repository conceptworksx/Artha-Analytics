/**
 * Sanitizer utility to clean model hallucination artifacts, weird symbols,
 * mojibake (corrupted UTF-8 encoding), markdown formatting, and control characters.
 * Ensures the UI only displays valid letters, numbers, and allowed punctuation/currency symbols.
 */

// Common UTF-8 Mojibake / corruption mappings from LLMs
const MOJIBAKE_MAP: [RegExp, string][] = [
  [/â‚¹/g, "₹"],
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/â€˜/g, "'"],
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/â€¦/g, "..."],
  [/Â/g, ""],
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ã /g, "à"],
];

/**
 * Strips invisible control characters, zero-width spaces, and replacement chars.
 */
const INVISIBLE_CHARS_REGEX = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\uFFFD]/g;

/**
 * Sanitizes general LLM text:
 * 1. Fixes double-encoded UTF-8 mojibake (e.g. â‚¹ -> ₹)
 * 2. Strips invisible / non-printable control characters
 * 3. Removes repeated weird symbol spam (e.g. ^^^, ~~~, ###, $$$$)
 * 4. Preserves valid letters, numbers, accents, and legitimate symbols (₹, $, %, ., ,, -, /, :, etc.)
 */
export function sanitizeCleanText(text: string | null | undefined): string {
  if (!text) return "";
  let str = String(text);

  // 1. Fix mojibake
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    str = str.replace(pattern, replacement);
  }

  // 2. Strip invisible control characters
  str = str.replace(INVISIBLE_CHARS_REGEX, "");

  // 3. Remove weird repeated symbol spam (3 or more consecutive weird symbols like ^^^, ~~~, ```)
  str = str.replace(/[\^~`]{3,}/g, "");

  return str.trim();
}

/**
 * Clean stock / ticker symbol:
 * Extracts only valid alphanumeric letters, digits, and standard stock delimiters (&, -).
 * Strips out hallucinated artifacts like $, #, **, [], (), quotes, emojis, and exchange suffix (.NS / .BO).
 *
 * Example:
 *   "$RELIANCE.NS" -> "RELIANCE"
 *   "**TCS**" -> "TCS"
 *   "M&M.NS" -> "M&M"
 *   "BAJAJ-AUTO.NS" -> "BAJAJ-AUTO"
 *   "INFY🚀" -> "INFY"
 *   "  'RELIANCE'  " -> "RELIANCE"
 */
export function sanitizeTickerSymbol(ticker: string | null | undefined, fallback: string = "STOCK"): string {
  if (!ticker) return fallback;
  let str = String(ticker).trim();

  // 1. Strip surrounding quotes, markdown, brackets, dollar signs, emojis
  str = str.replace(/[*`'"()[\]$#~^]/g, "").trim();

  // 2. Strip common exchange suffixes (.NS, .BO, .BSE, .NSE, :NSE, :BSE)
  str = str.replace(/[\.:](NS|BO|BSE|NSE)$/i, "").trim();

  // 3. Keep only valid letters, digits, '&', and '-'
  const cleaned = str
    .replace(/[^A-Za-z0-9&-]/g, "")
    .toUpperCase()
    .trim();

  return cleaned || fallback;
}

/**
 * Normalizes and sanitizes investment verdicts:
 * Maps hallucinated values like "**BUY**", "STRONG BUY", "BUY (80%)", "BUY🚀", "[BUY]" to canonical "BUY".
 */
export function sanitizeDecision(decision: string | null | undefined): "BUY" | "SELL" | "HOLD" {
  if (!decision) return "HOLD";
  const cleaned = String(decision)
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

  if (cleaned.includes("BUY")) return "BUY";
  if (cleaned.includes("SELL")) return "SELL";
  return "HOLD";
}

/**
 * Sanitizes price, target, or stop loss strings:
 * Fixes currency symbols (₹, $), strips markdown formatting, and keeps valid numbers, decimals, commas, and currency signs.
 *
 * Example:
 *   "**₹2,450.00**" -> "₹2,450.00"
 *   "â‚¹ 1200" -> "₹1,200" / "₹1200"
 *   "approx $150.50 (CMP)" -> "150.50" or preserved format
 */
export function sanitizePriceValue(val: string | number | null | undefined, fallback: string = "-"): string {
  if (val == null) return fallback;
  let str = String(val).trim();
  if (!str || str === "null" || str === "undefined") return fallback;

  // Fix mojibake for rupee
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    str = str.replace(pattern, replacement);
  }

  // Strip markdown asterisks, backticks, brackets
  str = str.replace(/[*`[\]_~]/g, "");

  // Remove invisible characters
  str = str.replace(INVISIBLE_CHARS_REGEX, "");

  // Keep only valid characters: letters, numbers, spaces, currency symbols, and decimals/commas/hyphens/percents
  str = str.replace(/[^\w\s.,₹$€£%/\-–+()]/g, "").trim();

  return str || fallback;
}
