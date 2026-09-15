"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Menu, Bookmark, Check, X, Scale, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  analyseTicker,
  runDebate,
  AnalysisError,
  cacheResponse,
  clearAuthSession,
  readCached,
  clearCached,
  getAuthToken,
  getSavedOpenRouterApiKey,
  saveOpenRouterApiKey,
  saveAnalysis,
  isAnalysisSaved,
  type AnalyseResponse,
} from "@/lib/api";

import dynamic from "next/dynamic";
import { LoadingView } from "@/components/research/LoadingView";
import { AppSidebar, type ViewKey } from "@/components/layout/AppSidebar";
import { StockMetricsPanel } from "@/components/charts/StockMetricsPanel";
import {
  TechnicalTrendChart,
  TechnicalVolatilityChart,
  TechnicalMomentumChart
} from "@/components/charts/TechnicalChart";
import {
  FundamentalGrowthChart,
  FundamentalProfitabilityChart
} from "@/components/charts/FundamentalChart";
import { useIsMobile } from "@/hooks/use-mobile";

const ViewLoadingSkeleton = () => (
  <div className="mx-auto max-w-[920px] animate-pulse space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
    <div className="h-6 w-48 rounded bg-zinc-100" />
    <div className="h-4 w-full rounded bg-zinc-100" />
    <div className="h-4 w-5/6 rounded bg-zinc-100" />
    <div className="h-32 w-full rounded bg-zinc-50" />
  </div>
);

const ReportView = dynamic(() => import("@/components/research/ReportView").then((m) => m.ReportView), {
  loading: ViewLoadingSkeleton,
});
const FundamentalReportView = dynamic(() => import("@/components/research/FundamentalReportView").then((m) => m.FundamentalReportView), {
  loading: ViewLoadingSkeleton,
});
const TechnicalReportView = dynamic(() => import("@/components/research/TechnicalReportView").then((m) => m.TechnicalReportView), {
  loading: ViewLoadingSkeleton,
});
const MarketReportView = dynamic(() => import("@/components/research/MarketReportView").then((m) => m.MarketReportView), {
  loading: ViewLoadingSkeleton,
});
const NewsReportView = dynamic(() => import("@/components/research/NewsReportView").then((m) => m.NewsReportView), {
  loading: ViewLoadingSkeleton,
});
const SectorReportView = dynamic(() => import("@/components/research/SectorReportView").then((m) => m.SectorReportView), {
  loading: ViewLoadingSkeleton,
});
const BullThesisView = dynamic(() => import("@/components/research/BullThesisView").then((m) => m.BullThesisView), {
  loading: ViewLoadingSkeleton,
});
const BearThesisView = dynamic(() => import("@/components/research/BearThesisView").then((m) => m.BearThesisView), {
  loading: ViewLoadingSkeleton,
});
const ManagerVerdictView = dynamic(() => import("@/components/research/ManagerVerdictView").then((m) => m.ManagerVerdictView), {
  loading: ViewLoadingSkeleton,
});

interface ErrorInfo {
  title: string;
  message: string;
}

export default function ResearchDashboardClient({ ticker }: { ticker: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const includeDebate = searchParams.get("debate") === "true";
  const rawMode = searchParams.get("mode");
  const thinkingMode = (["low", "medium", "high"].includes(rawMode as string) ? rawMode : "low") as "low" | "medium" | "high";
  const isMobile = useIsMobile();
  const [data, setData] = useState<AnalyseResponse | null>(null);
  const [view, setView] = useState<ViewKey>("overview");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isSaved, setIsSaved] = useState(() => isAnalysisSaved(ticker));
  const [saving, setSaving] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError, setDebateError] = useState<string | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = isAnalysisSaved(ticker);
    setIsSaved(saved);
    if (!saved) {
      setShowSavePrompt(true);
    }
  }, [ticker]);

  useEffect(() => {
    if (showSavePrompt) {
      const timer = setTimeout(() => {
        setShowSavePrompt(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showSavePrompt]);

  const handleSaveResearch = useCallback(async () => {
    if (!data || isSaved || saving) return;
    const token = getAuthToken();
    if (!token) {
      router.push("/search");
      return;
    }

    setSaving(true);
    try {
      await saveAnalysis({ data, authToken: token });
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save research", err);
    } finally {
      setSaving(false);
    }
  }, [data, isSaved, saving, router]);

  const handleTriggerDebate = useCallback(async (existingData?: AnalyseResponse) => {
    const current = existingData || data;
    if (!current || debateLoading) return;
    setDebateLoading(true);
    setDebateError(null);
    const openrouterApiKey = getSavedOpenRouterApiKey();
    const token = getAuthToken();
    try {
      const debateRes = await runDebate({
        ticker,
        openrouterApiKey: openrouterApiKey || undefined,
        authToken: token || undefined,
        thinking_mode: thinkingMode,
        analysisData: current,
      });
      const updatedData: AnalyseResponse = {
        ...current,
        bull_thesis: debateRes.bull_thesis || current.bull_thesis,
        bear_thesis: debateRes.bear_thesis || current.bear_thesis,
        verdict: debateRes.verdict || current.verdict,
      };
      setData(updatedData);
      cacheResponse(ticker, updatedData);
    } catch (err: any) {
      console.error("Failed to run debate", err);
      setDebateError(err?.message || "Failed to generate debate and verdict.");
    } finally {
      setDebateLoading(false);
    }
  }, [data, debateLoading, ticker, thinkingMode]);


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [view]);

  const authToken = getAuthToken();
  const openrouterApiKey = getSavedOpenRouterApiKey();
  const isRedirecting = !openrouterApiKey || !openrouterApiKey.trim();

  useEffect(() => {
    const controller = new AbortController();
    const authToken = getAuthToken();

    // Clear cache if this is a manual retry
    if (retryCount > 0) {
      clearCached(ticker);
    }

    const cached = readCached(ticker);
    if (cached && retryCount === 0) {
      setData(cached);
      setLoading(false);
      if (includeDebate && !cached.verdict) {
        handleTriggerDebate(cached);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    const openrouterApiKey = getSavedOpenRouterApiKey();
    if (!openrouterApiKey || !openrouterApiKey.trim()) {
      router.replace("/search");
      return;
    }

    analyseTicker({
      ticker,
      openrouterApiKey,
      authToken: authToken || undefined,
      signal: controller.signal,
      include_debate: false,
      thinking_mode: thinkingMode,
    })
      .then((d) => {
        cacheResponse(ticker, d);
        setData(d);
        setLoading(false);
        if (includeDebate && !d.verdict) {
          handleTriggerDebate(d);
        }
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof AnalysisError) {
          if (e.title === "SIGN IN REQUIRED") {
            clearAuthSession();
            router.replace("/search?expired=true");
            return;
          }
          if (e.title === "INVALID API KEY") {
            saveOpenRouterApiKey("");
            router.replace("/search");
            return;
          }
          if (e.title === "GUEST LIMIT REACHED") {
            clearCached(ticker);
            router.replace("/search?limit_reached=true");
            return;
          }
          setError({ title: e.title, message: e.message });
        } else {
          setError({
            title: "SOMETHING WENT WRONG",
            message: e instanceof Error ? e.message : "An unexpected error occurred while loading the analysis.",
          });
        }
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [ticker, retryCount, router, includeDebate, thinkingMode]);

  if (!mounted) {
    return null;
  }

  if (isRedirecting) {
    return null;
  }

  // ── Error page ─────────────────────────────────────────────────────────
  if (error) {
    const isRateLimit = /rate limit|too many|throttl/i.test(error.title);
    const isAuth = /auth|api key/i.test(error.title);

    // Pick icon color: amber for rate limits, red for everything else
    const iconColor = isRateLimit ? "var(--hold)" : "var(--sell)";

    // Pick SVG icon based on error type
    const icon = isAuth ? (
      // Lock icon for auth errors
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ) : isRateLimit ? (
      // Clock icon for rate limits
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ) : (
      // Alert triangle for everything else
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );

    return (
      <div className="flex min-h-screen items-center justify-center px-4 sm:px-6">
        <div className="max-w-lg text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)]">
            {icon}
          </div>

          {/* Error title */}
          <p className="font-mono text-[12px] tracking-[0.2em] mb-4" style={{ color: iconColor }}>
            {error.title}
          </p>

          {/* Error message */}
          <p className="text-[15px] leading-relaxed text-[var(--foreground)]">
            {error.message}
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                setData(null);
                setRetryCount((prev) => prev + 1);
              }}
              className="h-10 w-full sm:w-auto rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] px-6 font-sans text-[13px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
            >
              ↻ Retry
            </button>
            <button
              onClick={() => router.push("/search")}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-10 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] font-sans text-[13px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
            >
              <Search size={14} />
              <span>New Analysis</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading screen ─────────────────────────────────────────────────────
  if (loading || !data) return <LoadingView ticker={ticker} />;

  // ── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col print:h-auto print:block">
      {/* Navbar */}
      <header className="print:hidden flex h-16 shrink-0 items-center justify-between border-b border-black/[0.04] bg-white px-3 sm:px-5 shadow-sm transition-all">
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/">
            <img
              src="/navbar.png"
              alt="Artha Analytics"
              className="h-12 object-contain cursor-pointer transition-transform hover:scale-[1.02]"
            />
          </Link>
        </div>
        <div className="hidden sm:block font-mono text-[13px] text-[var(--muted-foreground)]">
          {data.ticker.split(".")[0].toUpperCase()}.NS · NSE
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {data && !data.verdict && (
            <button
              type="button"
              onClick={() => handleTriggerDebate()}
              disabled={debateLoading}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 transition-all text-[10px] sm:text-[13px] font-semibold cursor-pointer shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              title="Run Bull vs Bear Debate & Manager Verdict"
            >
              <Scale className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-700 shrink-0 ${debateLoading ? "animate-spin" : ""}`} />
              <span className="sm:hidden">{debateLoading ? "Debating..." : "Debate"}</span>
              <span className="hidden sm:inline">{debateLoading ? "Running Debate..." : "Run Debate & Verdict"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveResearch}
            disabled={isSaved || saving}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full border transition-all text-[10px] sm:text-[13px] font-semibold cursor-pointer shadow-sm whitespace-nowrap ${
              isSaved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 hover:shadow-md hover:scale-105 active:scale-95"
            }`}
            title={isSaved ? "Saved to Past Analysis" : "Save Research to Past Analysis"}
          >
            {isSaved ? (
              <>
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700 shrink-0" />
                <span className="sm:hidden">{saving ? "Saving..." : "Save"}</span>
                <span className="hidden sm:inline">{saving ? "Saving..." : "Save Research"}</span>
              </>
            )}
          </button>

          <Link
            href="/search"
            className="flex items-center justify-center p-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] font-sans text-[10px] sm:text-[13px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            title="New Analysis"
          >
            <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:inline sm:ml-1.5">New Analysis</span>
          </Link>
        </div>
      </header>

      {/* Floating Save Prompt Pop-up */}
      <AnimatePresence>
        {!isSaved && showSavePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="print:hidden fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3.5 shadow-2xl backdrop-blur-xl max-w-md text-zinc-100"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bookmark size={18} />
            </div>

            <div className="flex-1 text-left">
              <p className="text-[12px] font-medium leading-snug text-zinc-200">
                Save this report to view anytime in <strong className="text-amber-400 font-semibold">Past Analysis</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleSaveResearch();
                  setShowSavePrompt(false);
                }}
                disabled={saving}
                className="flex items-center gap-1 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 px-3.5 py-1.5 text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
              >
                {saving ? "Saving..." : "Save Now"}
              </button>

              <button
                onClick={() => setShowSavePrompt(false)}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-zinc-800"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>





      {isMobile && (
        <div className="print:hidden flex overflow-x-auto border-b border-[var(--border)] bg-white px-2 py-2 hide-scrollbar">
          <div className="flex space-x-2">
            {[
              { key: "overview", label: "Overview" },
              { key: "technical", label: "Technical" },
              { key: "fundamental", label: "Fundamental" },
              { key: "market", label: "Market" },
              { key: "sector", label: "Sector" },
              { key: "news", label: "News" },
              { key: "bull", label: "Bull Thesis" },
              { key: "bear", label: "Bear Thesis" },
              { key: "verdict", label: "Verdict" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as ViewKey)}
                className={`px-3 py-1.5 text-[13px] font-medium whitespace-nowrap rounded-md transition-colors ${view === tab.key
                    ? "bg-blue-800 text-white"
                    : "text-[var(--muted-foreground)] hover:bg-zinc-100"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 print:block print:min-h-0">
        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="print:hidden h-full">
            <AppSidebar
              active={view}
              onSelect={setView}
              isMobile={false}
              debateLoading={debateLoading}
            />
          </div>
        )}

        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto overscroll-contain bg-[#fafafa] p-3 sm:p-4 md:p-6 print:overflow-visible print:h-auto print:block print:w-full print:m-0 print:p-0">
          <ViewSwitch
            view={view}
            data={data}
            onTriggerDebate={handleTriggerDebate}
            debateLoading={debateLoading}
            debateError={debateError}
          />
        </main>
      </div>
    </div>
  );
}

import { memo } from "react";

const ViewSwitch = memo(function ViewSwitch({
  view,
  data,
  onTriggerDebate,
  debateLoading,
  debateError,
}: {
  view: ViewKey;
  data: AnalyseResponse;
  onTriggerDebate?: () => void;
  debateLoading?: boolean;
  debateError?: string | null;
}) {
  const t = data.ticker;

  switch (view) {
    case "overview":
      return <StockMetricsPanel data={data} />;
    case "news":
      if (typeof data.news_report === "string") {
        return (
          <ReportView
            title="News Analyst"
            ticker={t}
            status={data.status}
            content={data.news_report}
            filenameBase={`${t}_news_report`}
          />
        );
      }
      return (
        <NewsReportView
          title="News Analyst"
          ticker={t}
          status={data.status}
          reportData={data.news_report}
          companyNews={data.company_news}
          indianNews={data.indian_news}
          globalNews={data.global_news}
          filenameBase={`${t}_news_report`}
        />
      );
    case "technical":
      if (typeof data.technical_report === "string") {
        return (
          <ReportView
            title="Technical Analyst"
            ticker={t}
            status={data.status}
            content={data.technical_report}
            filenameBase={`${t}_technical_report`}
          >
            <TechnicalTrendChart data={data.charts_data?.technical_history} />
            <TechnicalVolatilityChart data={data.charts_data?.technical_history} />
            <TechnicalMomentumChart data={data.charts_data?.technical_history} />
          </ReportView>
        );
      }
      return (
        <TechnicalReportView
          title="Technical Analyst"
          ticker={t}
          status={data.status}
          reportData={data.technical_report}
          technicalData={data.technical_data}
          chartData={data.charts_data?.technical_history}
          filenameBase={`${t}_technical_report`}
        />
      );
    case "fundamental":
      if (typeof data.fundamental_report === "string") {
        return (
          <ReportView
            title="Fundamental Analyst"
            ticker={t}
            status={data.status}
            content={data.fundamental_report}
            filenameBase={`${t}_fundamental_report`}
          >
            <FundamentalGrowthChart data={data.charts_data?.financials_history} />
            <FundamentalProfitabilityChart data={data.charts_data?.financials_history} />
          </ReportView>
        );
      }
      return (
        <FundamentalReportView
          title="Fundamental Analyst"
          ticker={t}
          status={data.status}
          reportData={data.fundamental_report}
          fundamentalData={data.fundamental_data}
          chartData={data.charts_data?.financials_history}
          filenameBase={`${t}_fundamental_report`}
        />
      );
    case "market":
      if (typeof data.market_report === "string") {
        return (
          <ReportView
            title="Market Analyst"
            ticker={t}
            status={data.status}
            content={data.market_report}
            filenameBase={`${t}_market_report`}
          />
        );
      }
      return (
        <MarketReportView
          title="Market Analyst"
          ticker={t}
          status={data.status}
          reportData={data.market_report}
          marketData={data.market_data}
          filenameBase={`${t}_market_report`}
        />
      );
    case "sector":
      if (typeof data.sector_report === "string") {
        return (
          <ReportView
            title="Sector Analyst"
            ticker={t}
            status={data.status}
            content={data.sector_report}
            filenameBase={`${t}_sector_report`}
          />
        );
      }
      return (
        <SectorReportView
          title="Sector Analyst"
          ticker={t}
          status={data.status}
          reportData={data.sector_report}
          filenameBase={`${t}_sector_report`}
        />
      );
    case "bull":
      return (
        <BullThesisView
          ticker={t}
          data={data.bull_thesis}
          onTriggerDebate={onTriggerDebate}
          debateLoading={debateLoading}
          debateError={debateError}
        />
      );
    case "bear":
      return (
        <BearThesisView
          ticker={t}
          data={data.bear_thesis}
          onTriggerDebate={onTriggerDebate}
          debateLoading={debateLoading}
          debateError={debateError}
        />
      );
    case "verdict":
      return (
        <ManagerVerdictView
          ticker={t}
          data={data.verdict}
          chartsData={data.charts_data}
          onTriggerDebate={onTriggerDebate}
          debateLoading={debateLoading}
          debateError={debateError}
        />
      );
  }
});
