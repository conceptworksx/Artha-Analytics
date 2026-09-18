"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { Verdict } from "@/lib/api";

import { sanitizeTickerSymbol, sanitizeDecision, sanitizePriceValue, sanitizeCleanText } from "@/lib/sanitizer";

interface OverviewVerdictCardProps {
  verdict: Verdict;
  ticker: string;
  onViewFullVerdict?: () => void;
}

export const OverviewVerdictCard = memo(function OverviewVerdictCard({
  verdict,
  ticker,
  onViewFullVerdict,
}: OverviewVerdictCardProps) {
  if (!verdict || !verdict.decision) return null;

  const decision = sanitizeDecision(verdict.decision);
  const isBuy = decision === "BUY";
  const isSell = decision === "SELL";
  const isHold = !isBuy && !isSell;

  const symbol = sanitizeTickerSymbol(ticker);
  const confidence = Math.round((verdict.confidence || 0.75) * 100);

  // Theme palettes based on institutional decision
  const theme = isBuy
    ? {
        border: "border-emerald-500/30",
        bg: "bg-gradient-to-r from-emerald-500/[0.07] via-white to-emerald-500/[0.02]",
        pillBg: "bg-emerald-600 text-white",
        glow: "shadow-[0_4px_20px_rgba(16,185,129,0.08)]",
        badge: "bg-emerald-50 border-emerald-200 text-emerald-800",
        textAcc: "text-emerald-700",
        targetText: "text-emerald-700",
      }
    : isSell
    ? {
        border: "border-rose-500/30",
        bg: "bg-gradient-to-r from-rose-500/[0.07] via-white to-rose-500/[0.02]",
        pillBg: "bg-rose-600 text-white",
        glow: "shadow-[0_4px_20px_rgba(244,63,94,0.08)]",
        badge: "bg-rose-50 border-rose-200 text-rose-800",
        textAcc: "text-rose-700",
        targetText: "text-rose-700",
      }
    : {
        border: "border-amber-500/30",
        bg: "bg-gradient-to-r from-amber-500/[0.07] via-white to-amber-500/[0.02]",
        pillBg: "bg-amber-600 text-white",
        glow: "shadow-[0_4px_20px_rgba(245,158,11,0.08)]",
        badge: "bg-amber-50 border-amber-200 text-amber-800",
        textAcc: "text-amber-700",
        targetText: "text-amber-700",
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`mx-auto max-w-[920px] rounded-xl sm:rounded-2xl border ${theme.border} ${theme.bg} ${theme.glow} p-3 sm:p-5 md:p-6 backdrop-blur-md transition-all`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-4 border-b border-black/[0.05]">
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2.5">
          {/* Main Decision Pill */}
          <span
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[11px] sm:text-[13px] font-black tracking-wider uppercase shadow-xs ${theme.pillBg}`}
          >
            <Scale className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            {decision}
          </span>

          {/* Confidence Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-semibold font-mono ${theme.badge}`}
          >
            <Percent className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            {confidence}% Conviction
          </span>

          {/* Subtitle tag */}
          <span className="hidden md:inline-block font-mono text-[11px] text-zinc-400 font-medium tracking-wide uppercase">
            {symbol} · Research Manager Verdict
          </span>
        </div>

        {/* View Full Verdict CTA */}
        {onViewFullVerdict && (
          <button
            type="button"
            onClick={onViewFullVerdict}
            className="group flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-[12px] font-semibold text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer shrink-0"
          >
            <span className="hidden xs:inline">Full Architecture</span>
            <span className="xs:hidden">Verdict</span>
            <ChevronRight
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        )}
      </div>

      {/* Trade Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2.5 sm:pt-4">
        {/* Entry */}
        <div className="rounded-lg sm:rounded-xl bg-white/80 border border-zinc-200/60 p-2 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-zinc-400 mb-0.5 sm:mb-1">
            <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
              Rec. Entry
            </span>
          </div>
          <span className="font-sans text-[13px] sm:text-[15px] font-bold text-zinc-900 block truncate">
            {sanitizePriceValue(verdict.entry_price, "Market")}
          </span>
        </div>

        {/* Target */}
        <div className="rounded-lg sm:rounded-xl bg-white/80 border border-zinc-200/60 p-2 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-zinc-400 mb-0.5 sm:mb-1">
            <ArrowUpRight className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isBuy ? "text-emerald-600" : ""}`} />
            <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
              Price Target
            </span>
          </div>
          <span className={`font-sans text-[13px] sm:text-[15px] font-bold ${theme.targetText} block truncate`}>
            {sanitizePriceValue(verdict.exit_price, "-")}
          </span>
        </div>

        {/* Stop Loss */}
        <div className="rounded-lg sm:rounded-xl bg-white/80 border border-zinc-200/60 p-2 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-zinc-400 mb-0.5 sm:mb-1">
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 shrink-0" />
            <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
              Stop Loss
            </span>
          </div>
          <span className="font-sans text-[13px] sm:text-[15px] font-bold text-rose-700 block truncate">
            {sanitizePriceValue(verdict.stop_loss, "-")}
          </span>
        </div>

        {/* Hold Duration */}
        <div className="rounded-lg sm:rounded-xl bg-white/80 border border-zinc-200/60 p-2 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-1 text-zinc-400 mb-0.5 sm:mb-1">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
              Time Horizon
            </span>
          </div>
          <span className="font-sans text-[13px] sm:text-[15px] font-bold text-zinc-900 block truncate">
            {sanitizeCleanText(verdict.hold_duration || verdict.strategy || "Swing")}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
