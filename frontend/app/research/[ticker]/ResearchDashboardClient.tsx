"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  analyseTicker,
  AnalysisError,
  cacheResponse,
  clearAuthSession,
  readCached,
  clearCached,
  getAuthToken,
  getSavedGroqApiKey,
  saveGroqApiKey,
  type AnalyseResponse,
} from "@/lib/api";
import { LoadingView } from "@/components/research/LoadingView";
import { AppSidebar, type ViewKey } from "@/components/layout/AppSidebar";
import { ReportView } from "@/components/research/ReportView";
import { StockMetricsPanel } from "@/components/charts/StockMetricsPanel";
import { TechnicalChart } from "@/components/charts/TechnicalChart";
import { FundamentalChart } from "@/components/charts/FundamentalChart";

interface ErrorInfo {
  title: string;
  message: string;
}

export default function ResearchDashboardClient({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [data, setData] = useState<AnalyseResponse | null>(null);
  const [view, setView] = useState<ViewKey>("overview");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [view]);

  const authToken = getAuthToken();
  const groqApiKey = getSavedGroqApiKey();
  const isRedirecting = !groqApiKey || !groqApiKey.trim();

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
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    const groqApiKey = getSavedGroqApiKey();
    if (!groqApiKey || !groqApiKey.trim()) {
      router.replace("/search");
      return;
    }

    analyseTicker({
      ticker,
      groqApiKey,
      authToken: authToken || undefined,
      signal: controller.signal,
    })
      .then((d) => {
        cacheResponse(ticker, d);
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof AnalysisError) {
          if (e.title === "SIGN IN REQUIRED") {
            clearAuthSession();
            router.replace("/search");
            return;
          }
          if (e.title === "INVALID API KEY") {
            saveGroqApiKey("");
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
  }, [ticker, retryCount, router]);

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
      <div className="flex min-h-screen items-center justify-center px-6">
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
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                setData(null);
                setRetryCount((prev) => prev + 1);
              }}
              className="h-10 border border-[var(--foreground)] bg-[var(--foreground)] px-5 font-mono text-[12px] text-white rounded-lg shadow-sm transition-all hover:bg-[#333330]"
            >
              ↻ Retry
            </button>
            <button
              onClick={() => router.push("/search")}
              className="flex items-center gap-2 px-4 py-1.5 h-10 rounded-lg border border-black/10 bg-zinc-50/50 font-mono text-[13px] font-medium text-zinc-800 hover:bg-black hover:text-white transition-all duration-300 hover:shadow-md hover:border-black active:scale-[0.98]"
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
    <div className="flex h-screen flex-col">
      {/* Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-5">
        <div className="flex items-center">
          <Link href="/">
            <img
              src="/navbar.png"
              alt="Artha Analytics"
              className="h-14 object-contain cursor-pointer"
            />
          </Link>
        </div>
        <div className="font-mono text-[13px] text-[var(--muted-foreground)]">
          {data.ticker.split(".")[0].toUpperCase()}.NS · NSE
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-black/10 bg-zinc-50/50 font-mono text-[13px] font-medium text-zinc-800 hover:bg-black hover:text-white transition-all duration-300 hover:shadow-md hover:border-black active:scale-[0.98]"
          >
            <Search size={14} />
            <span>New Analysis</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <AppSidebar active={view} onSelect={setView} />

        <main ref={mainRef} className="flex-1 overflow-y-auto bg-[var(--background)] p-8">
          <ViewSwitch view={view} data={data} />
        </main>
      </div>
    </div>
  );
}

function ViewSwitch({
  view,
  data,
}: {
  view: ViewKey;
  data: AnalyseResponse;
}) {
  const t = data.ticker;

  switch (view) {
    case "overview":
      return <StockMetricsPanel data={data} />;
    case "news":
      return (
        <ReportView
          title="News Analyst"
          ticker={t}
          status={data.status}
          content={data.news_report}
          filenameBase={`${t}_news_report`}
        />
      );
    case "technical":
      return (
        <ReportView
          title="Technical Analyst"
          ticker={t}
          status={data.status}
          content={data.technical_report}
          filenameBase={`${t}_technical_report`}
        >
          <TechnicalChart data={data.charts_data?.technical_history} />
        </ReportView>
      );
    case "fundamental":
      return (
        <ReportView
          title="Fundamental Analyst"
          ticker={t}
          status={data.status}
          content={data.fundamental_report}
          filenameBase={`${t}_fundamental_report`}
        >
          <FundamentalChart data={data.charts_data?.financials_history} />
        </ReportView>
      );
    case "market":
      return (
        <ReportView
          title="Market Analyst"
          ticker={t}
          status={data.status}
          content={data.market_report}
          filenameBase={`${t}_market_report`}
        />
      );
    case "sector":
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
}
