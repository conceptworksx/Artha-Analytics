"use client";

import { motion } from "framer-motion";
import { TrendingDown, AlertCircle, XCircle, Zap } from "lucide-react";
import type { ThesisOutput } from "@/lib/api";

export function BearThesisView({
  ticker,
  data,
}: {
  ticker: string;
  data?: ThesisOutput | null;
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
            The investment debate phase was skipped for this analysis. To view the Bull/Bear debate, ensure you toggle "Include Investment Debate" when searching.
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
            DEBATE FAILED
          </h3>
          <p className="text-[14px] leading-relaxed text-red-800/80">
            {data.introduction || "The agents encountered an error while formulating the thesis."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[920px] min-h-full rounded-[2rem] bg-white/40 p-4 sm:p-8 text-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative backdrop-blur-xl border border-black/[0.04]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-rose-400/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-rose-300/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_4px_20px_rgba(225,29,72,0.2)] border border-rose-500/20"
          >
            <TrendingDown className="h-8 w-8 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
          >
            {data.title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-50 px-4 py-1.5 backdrop-blur-md"
          >
            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span className="font-mono text-[12px] font-medium text-rose-700 tracking-wider">
              {ticker.split(".")[0]} · BEAR THESIS
            </span>
          </motion.div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12 text-center"
        >
          <p className="text-[16px] leading-relaxed text-zinc-600 max-w-3xl mx-auto">
            {data.introduction}
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {data.arguments?.map((arg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              className="group relative flex flex-col rounded-2xl border border-black/[0.04] bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_8px_30px_rgba(225,29,72,0.05)] hover:bg-white/90"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="text-[16px] font-semibold text-zinc-900 leading-tight">
                  {arg.heading}
                </h3>
              </div>
              <ul className="space-y-3 pl-11">
                {arg.details?.map((detail, dIdx) => (
                  <li key={dIdx} className="text-[14px] leading-relaxed text-zinc-600 relative before:absolute before:left-[-1.25rem] before:top-[0.6rem] before:h-1.5 before:w-1.5 before:rounded-full before:bg-zinc-300 group-hover:before:bg-rose-400 transition-colors">
                    {detail}
                  </li>
                ))}
              </ul>
              {arg.rebuttal && (
                <div className="mt-5 ml-11 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[13px] italic text-rose-800/80">
                    <span className="font-semibold not-italic text-rose-700">Counter: </span>
                    {arg.rebuttal}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
