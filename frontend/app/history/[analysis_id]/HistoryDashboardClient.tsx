"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getAnalysisById,
  clearAuthSession,
  getAuthToken,
  type AnalyseResponse,
} from "@/lib/api";
import { LoadingView } from "@/components/research/LoadingView";
import { AppSidebar, type ViewKey } from "@/components/layout/AppSidebar";
import { ReportView } from "@/components/research/ReportView";
import { FundamentalReportView } from "@/components/research/FundamentalReportView";
import { TechnicalReportView } from "@/components/research/TechnicalReportView";
import { MarketReportView } from "@/components/research/MarketReportView";
import { NewsReportView } from "@/components/research/NewsReportView";
import { SectorReportView } from "@/components/research/SectorReportView";
import { BullThesisView } from "@/components/research/BullThesisView";
import { BearThesisView } from "@/components/research/BearThesisView";
import { ManagerVerdictView } from "@/components/research/ManagerVerdictView";
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

interface ErrorInfo {
  title: string;
  message: string;
}

export default function HistoryDashboardClient({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [data, setData] = useState<AnalyseResponse | null>(null);
  const [view, setView] = useState<ViewKey>("overview");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [view]);

  useEffect(() => {
    const authToken = getAuthToken();

    if (!authToken) {
      router.replace("/search?auth=true");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    getAnalysisById(analysisId, authToken)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.message === "Analysis not found") {
          setError({ title: "NOT FOUND", message: "This analysis does not exist or you do not have permission to view it." });
        } else {
          setError({
            title: "SOMETHING WENT WRONG",
            message: e instanceof Error ? e.message : "An unexpected error occurred while loading the analysis history.",
          });
        }
        setLoading(false);
      });
  }, [analysisId, router]);

  if (!mounted) {
    return null;
  }

  // ── Error page ─────────────────────────────────────────────────────────
  if (error) {
    const isAuth = /auth/i.test(error.title);
    const iconColor = "var(--sell)";
    const icon = isAuth ? (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ) : (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );

    return (
      <div className="flex min-h-screen items-center justify-center px-4 sm:px-6">
        <div className="max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)]">
            {icon}
          </div>
          <p className="font-mono text-[12px] tracking-[0.2em] mb-4" style={{ color: iconColor }}>
            {error.title}
          </p>
          <p className="text-[15px] leading-relaxed text-[var(--foreground)]">
            {error.message}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push("/search")}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-10 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] font-sans text-[13px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
            >
              <Search size={14} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading screen ─────────────────────────────────────────────────────
  if (loading || !data) return <LoadingView ticker={"Loading History..."} />;

  // ── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col print:h-auto print:block">
      {/* Navbar */}
      <header className="print:hidden flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-black/[0.04] bg-white px-3 sm:px-5 shadow-sm transition-all">
        <div className="flex items-center gap-2">
          <Link href="/">
            <img
              src="/navbar.png"
              alt="Artha Analytics"
              className="h-10 sm:h-14 object-contain cursor-pointer"
            />
          </Link>
        </div>
        <div className="hidden sm:block font-mono text-[13px] text-[var(--muted-foreground)]">
          {data.ticker.split(".")[0].toUpperCase()}.NS (Historical View)
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/search"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] font-sans text-[11px] sm:text-[13px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
          >
            <Search size={14} />
            <span className="hidden sm:inline">New Analysis</span>
          </Link>
        </div>
      </header>

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
            />
          </div>
        )}

        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto bg-gradient-to-b from-[#fafafa] to-white p-3 sm:p-4 md:p-6 print:overflow-visible print:h-auto print:block print:w-full print:m-0 print:p-0">
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
      return <BullThesisView ticker={t} data={data.bull_thesis} />;
    case "bear":
      return <BearThesisView ticker={t} data={data.bear_thesis} />;
    case "verdict":
      return <ManagerVerdictView ticker={t} data={data.verdict} chartsData={data.charts_data} />;
  }
}
