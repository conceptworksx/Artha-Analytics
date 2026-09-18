"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Scale, ShieldAlert, CheckCircle2 } from "lucide-react";
import { sanitizeTickerSymbol } from "@/lib/sanitizer";

interface DebateArenaLoaderProps {
  ticker: string;
}

export function DebateArenaLoader({ ticker }: DebateArenaLoaderProps) {
  const cleanSymbol = sanitizeTickerSymbol(ticker);

  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      {/* Banner informing user they can freely browse */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 rounded-xl border border-purple-200/80 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/80 px-4 py-3 text-[13px] text-purple-900 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600"></span>
          </span>
          <span>
            <strong className="font-semibold">Debate in Session:</strong> You can freely browse the 5 specialist analyst tabs below (Technicals, Fundamentals, Market, News, Sector) while the debate concludes.
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-purple-700 bg-purple-100/70 border border-purple-200/60 px-2.5 py-0.5 rounded-full font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />
          Deliberation Active
        </span>
      </motion.div>

      {/* 3-Column Arena Container */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 font-mono text-[11px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
            <Scale size={13} className="text-purple-600" />
            Institutional Debate Arena
          </div>
          <h2 className="text-[20px] font-semibold text-zinc-900 tracking-tight">
            Synthesizing {cleanSymbol} Investment Verdict
          </h2>
          <p className="text-[13px] text-zinc-500 mt-1 max-w-lg mx-auto">
            Cross-examining findings from all 5 specialist reports into opposing theses and an objective final decision.
          </p>
        </div>

        {/* 3-Card Grid: Bull vs Manager vs Bear */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Bull Researcher Card */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white p-4.5 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-sans text-[14px] font-bold text-zinc-900">
                      Bull Researcher
                    </h3>
                    <p className="font-mono text-[10px] text-emerald-700 font-medium uppercase tracking-wider">
                      Upside Thesis
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-zinc-600 leading-relaxed">
                Mining structural support levels, operating leverage catalysts, and institutional accumulation trends.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-emerald-800 font-medium">
                Drafting accumulation thesis...
              </span>
            </div>
          </motion.div>

          {/* 2. Research Manager Card (Center) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/50 to-white p-4.5 flex flex-col justify-between shadow-sm order-last md:order-none"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-sans text-[14px] font-bold text-zinc-900">
                      Research Manager
                    </h3>
                    <p className="font-mono text-[10px] text-purple-700 font-medium uppercase tracking-wider">
                      Final Verdict Arbiter
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-zinc-600 leading-relaxed">
                Auditing argument validity, risk-reward ratios, and target price parameters for BUY, HOLD, or SELL.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="font-mono text-[11px] text-purple-800 font-medium">
                Awaiting debate arguments...
              </span>
            </div>
          </motion.div>

          {/* 3. Bear Researcher Card */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-xl border border-rose-200 bg-gradient-to-b from-rose-50/50 to-white p-4.5 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-sans text-[14px] font-bold text-zinc-900">
                      Bear Researcher
                    </h3>
                    <p className="font-mono text-[10px] text-rose-700 font-medium uppercase tracking-wider">
                      Downside & Risk Thesis
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-zinc-600 leading-relaxed">
                Stress-testing valuation multiples, overhead technical resistance walls, and macro drawdown exposures.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-rose-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-mono text-[11px] text-rose-800 font-medium">
                Evaluating valuation risks...
              </span>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Stepper Bar */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>5 Analyst Reports Ready</span>
          </div>
          <div className="flex items-center gap-2 text-purple-700 font-medium">
            <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />
            <span>Bull vs. Bear Cross-Examination Active</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span>Executive Verdict Finalization</span>
          </div>
        </div>
      </div>
    </div>
  );
}

