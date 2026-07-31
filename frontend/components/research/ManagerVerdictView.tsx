"use client";

import { motion } from "framer-motion";
import { Scale, AlertCircle, Zap, Target, ArrowUpRight, ArrowDownRight, Clock, ShieldAlert, Rocket } from "lucide-react";
import type { Verdict } from "@/lib/api";

export function ManagerVerdictView({
  ticker,
  data,
}: {
  ticker: string;
  data?: Verdict | null;
}) {
  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
        <div className="flex max-w-md flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <Zap className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="font-mono text-[13px] font-bold tracking-widest text-zinc-900">
            DEBATE SKIPPED
          </h3>
          <p className="text-[14px] leading-relaxed text-zinc-500">
            The investment debate phase was skipped for this analysis. To view the Manager Verdict, ensure you toggle "Include Investment Debate" when searching.
          </p>
        </div>
      </div>
    );
  }

  if (data.status === "failure") {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-sm">
        <div className="flex max-w-md flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="font-mono text-[13px] font-bold tracking-widest text-red-600">
            VERDICT FAILED
          </h3>
          <p className="text-[14px] leading-relaxed text-red-800/80">
            {data.rationale || "The manager encountered an error while formulating the verdict."}
          </p>
        </div>
      </div>
    );
  }

  const isBuy = data.decision === "BUY";
  const isSell = data.decision === "SELL";
  
  const decisionColor = isBuy 
    ? "text-emerald-600" 
    : isSell 
      ? "text-rose-600" 
      : "text-amber-600";
      
  const decisionBg = isBuy 
    ? "from-emerald-50 to-emerald-100/50 border-emerald-200" 
    : isSell 
      ? "from-rose-50 to-rose-100/50 border-rose-200" 
      : "from-amber-50 to-amber-100/50 border-amber-200";

  return (
    <div className="mx-auto max-w-[920px] min-h-full rounded-[2rem] bg-white/40 p-4 sm:p-8 text-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative backdrop-blur-xl border border-black/[0.04]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-amber-300/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.2)] border border-amber-500/20"
          >
            <Scale className="h-8 w-8 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="mb-3 flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-50 px-4 py-1.5 backdrop-blur-md">
              <span className="font-mono text-[12px] font-medium text-amber-700 tracking-wider">
                {ticker.split(".")[0]} · MANAGER VERDICT
              </span>
            </div>
            
            <div className={`mt-4 rounded-3xl border bg-gradient-to-b ${decisionBg} px-10 py-6 backdrop-blur-md`}>
              <h1 className={`text-5xl font-black tracking-tight ${decisionColor} drop-shadow-md`}>
                {data.decision}
              </h1>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-[14px] font-medium text-zinc-600">Confidence</span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200">
                  <div 
                    className={`h-full rounded-full ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.round(data.confidence * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[14px] font-bold text-zinc-900">
                  {Math.round(data.confidence * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white/70 p-6 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <Target className="mb-3 h-6 w-6 text-zinc-400" />
            <span className="mb-1 font-mono text-[11px] font-bold tracking-widest text-zinc-500">ENTRY</span>
            <span className="text-[18px] font-semibold text-zinc-900">{data.entry_price}</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white/70 p-6 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowUpRight className="mb-3 h-6 w-6 text-emerald-500" />
            <span className="mb-1 font-mono text-[11px] font-bold tracking-widest text-zinc-500">TARGET</span>
            <span className="text-[18px] font-semibold text-emerald-700">{data.exit_price}</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white/70 p-6 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowDownRight className="mb-3 h-6 w-6 text-rose-500" />
            <span className="mb-1 font-mono text-[11px] font-bold tracking-widest text-zinc-500">STOP LOSS</span>
            <span className="text-[18px] font-semibold text-rose-700">{data.stop_loss}</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 backdrop-blur-xl shadow-sm"
        >
          <h3 className="mb-4 font-mono text-[12px] font-bold tracking-widest text-amber-600">RATIONALE</h3>
          <p className="mb-6 text-[16px] leading-relaxed text-zinc-700">
            {data.rationale}
          </p>
          
          <h3 className="mb-4 font-mono text-[12px] font-bold tracking-widest text-amber-600">STRATEGY</h3>
          <div className="flex items-start gap-4">
            <div className="mt-1 flex shrink-0 items-center justify-center rounded-full bg-white border border-amber-200 p-2 shadow-sm">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[15px] leading-relaxed text-zinc-700">
                {data.strategy}
              </p>
              <p className="mt-2 font-mono text-[12px] text-zinc-500">
                Horizon: <span className="text-zinc-800 font-semibold">{data.hold_duration}</span>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-black/[0.04] bg-white/70 p-6 backdrop-blur-xl shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-emerald-500" />
                <h3 className="font-mono text-[12px] font-bold tracking-widest text-zinc-600">CATALYSTS</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                data.bull_strength === 'strong' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                data.bull_strength === 'moderate' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}>
                {data.bull_strength} bull
              </span>
            </div>
            <ul className="space-y-3">
              {data.key_catalysts?.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-zinc-600">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl border border-black/[0.04] bg-white/70 p-6 backdrop-blur-xl shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                <h3 className="font-mono text-[12px] font-bold tracking-widest text-zinc-600">RISKS</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                data.bear_strength === 'strong' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                data.bear_strength === 'moderate' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}>
                {data.bear_strength} bear
              </span>
            </div>
            <ul className="space-y-3">
              {data.key_risks?.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-zinc-600">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
