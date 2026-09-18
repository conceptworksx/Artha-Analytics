"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Landmark,
  Globe2,
  Newspaper,
  Layers,
  Loader2,
} from "lucide-react";

const SPECIALISTS = [
  { name: "Technical", focus: "Price & Trend", icon: Activity },
  { name: "Fundamental", focus: "Financial Health", icon: Landmark },
  { name: "Global Market", focus: "Macro & Indices", icon: Globe2 },
  { name: "News & Sentiment", focus: "Corporate Disclosures", icon: Newspaper },
  { name: "Sector", focus: "Peer Benchmarks", icon: Layers },
];

export function AgentPipelineTracker() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-[920px] rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-5 shadow-xs"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 shrink-0">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-600" />
          </div>
          <div>
            <h3 className="font-sans text-[13px] sm:text-[14px] font-bold text-zinc-900 tracking-tight">
              Synthesizing Specialist Research
            </h3>
            <p className="text-[11px] sm:text-[12px] text-zinc-500">
              Quantitative data loaded. Compiling qualitative analyst reports.
            </p>
          </div>
        </div>

        {/* Live Badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 font-mono text-[10px] sm:text-[11px] font-medium shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>5 Analysts Active</span>
        </span>
      </div>

      {/* Specialist Status Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2.5">
        {SPECIALISTS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.name}
              className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-1.5 sm:py-2 text-left"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-zinc-200/80 text-zinc-700 shrink-0">
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-[11px] sm:text-[12px] font-semibold text-zinc-900 truncate">
                  {s.name}
                </p>
                <p className="font-mono text-[9px] text-zinc-400 truncate">
                  {s.focus}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
