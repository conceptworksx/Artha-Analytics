import React, { memo } from "react";
import { sanitizeCleanText } from "@/lib/sanitizer";
import { humanizeText } from "@/lib/humanizer";

const BOLD_REGEX = /(?:(?:US\$|Rs\.?|₹|\$|€|£)\s*)?\b\d+(?:,\d{3})*(?:\.\d+)?\b(?:\s*(?:billion|million|trillion|lakhs?|crores?|%))?|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b|\bFY\d{2,4}\b|\b\d{4}(?:-\d{2,4})?\b/gi;

export const FormattedText = memo(function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  const sanitized = sanitizeCleanText(text);
  if (!sanitized) return null;

  // 1. Transform rigid backend tokens & confluence factors to human-friendly words
  const humanized = humanizeText(sanitized);

  // 2. Strip raw markdown annotations like **, *, and leading dashes that LLM might output
  const cleanText = humanized
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^-\s*/gm, "")
    .trim();

  // 3. Fast path: if short simple text without numbers, currency symbols, or percentages
  if (cleanText.length < 15 && !/[\d*₹$€£%]/.test(cleanText)) {
    return <>{cleanText}</>;
  }

  // 4. Split and render simple natural text with standard bolding for financial figures
  const parts = cleanText.split(BOLD_REGEX);
  const matches = cleanText.match(BOLD_REGEX) || [];

  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {matches[i] !== undefined && (
            <span className="font-bold text-zinc-900">{matches[i]}</span>
          )}
        </React.Fragment>
      ))}
    </>
  );
});

