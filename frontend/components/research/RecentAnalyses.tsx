"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Activity, ArrowRight, TrendingUp } from "lucide-react";
import { getAnalysisHistory, getAuthToken, type AnalysisSummary, type AuthUser } from "@/lib/api";

export function RecentAnalyses({ user, inModal = false }: { user: AuthUser, inModal?: boolean }) {
  const [history, setHistory] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setError("No authentication token found.");
          setLoading(false);
          return;
        }
        const data = await getAnalysisHistory(token);
        setHistory(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load recent analyses.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchHistory();
    }
  }, [user]);

  if (!user || loading) return null;

  if (history.length === 0) {
    return null;
  }

  return (
    <div className={`${inModal ? "mt-2" : "mt-10"} w-full animate-[fadeIn_0.5s_ease-out]`}>
      <div className="flex items-center gap-2 mb-4 pl-2">
        <Activity size={16} className="text-zinc-400" />
        <span className="text-[12px] font-semibold uppercase tracking-widest text-zinc-400">
          Your Recent Analyses
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {history.map((analysis) => (
          <Link
            href={`/history/${analysis.analysis_id}`}
            key={analysis.analysis_id}
            className="group relative flex flex-col justify-between rounded-[1.5rem] border border-black/[0.04] bg-white/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:bg-white/90 active:scale-[0.98] cursor-pointer"
          >
            {/* Ambient glow on hover */}
            <div className="absolute inset-0 -z-10 rounded-[1.5rem] bg-gradient-to-br from-amber-500/0 to-blue-500/0 transition-colors duration-500 group-hover:from-amber-500/5 group-hover:to-blue-500/5" />

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-mono text-[16px] font-bold text-zinc-900 flex items-center gap-2">
                  {analysis.ticker}
                  {analysis.status === "success" && (
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                  )}
                </h3>
                <p className="mt-1 text-[13px] text-zinc-500 line-clamp-1">
                  {analysis.company_name || "Company Overview"}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 transition-colors group-hover:bg-amber-50 group-hover:text-amber-500">
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Clock size={12} />
              <span>
                {new Date(analysis.analyzed_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="mx-1">•</span>
              <span>
                {new Date(analysis.analyzed_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
