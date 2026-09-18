import React, { useRef } from "react";
import { Loader2 } from "lucide-react";

import { FormattedText } from "@/components/ui/FormattedText";
import { sanitizeTickerSymbol } from "@/lib/sanitizer";

function AnalysisTextSection({
  content,
  isPending,
  fallback = "No analysis available.",
}: {
  content?: string | null;
  isPending?: boolean;
  fallback?: string;
}) {
  if (content && content.trim()) {
    return (
      <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
        <span className="font-semibold text-zinc-900">Analysis: </span>
        <FormattedText text={content} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="p-4 bg-gradient-to-r from-zinc-50/90 via-amber-500/[0.02] to-zinc-50/90 border border-zinc-200/75 rounded-xl text-[13px] text-zinc-600 leading-relaxed shadow-sm space-y-2.5 animate-pulse">
        <div className="flex items-center gap-2 text-zinc-800 font-medium text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span>Specialist compiling qualitative market insights...</span>
        </div>
        <div className="h-2.5 w-full bg-gradient-to-r from-zinc-200/70 via-zinc-100 to-zinc-200/70 rounded-md" />
        <div className="h-2.5 w-4/5 bg-gradient-to-r from-zinc-200/60 via-zinc-100 to-zinc-200/60 rounded-md" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-500 italic leading-relaxed shadow-sm">
      <span className="font-semibold text-zinc-700 not-italic">Analysis: </span>
      {fallback}
    </div>
  );
}

const MetricTable = React.memo(function MetricTable({
  rows,
}: {
  rows: { label: string; value: any }[];
  title?: string;
}) {
  return (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800 w-1/3">{row.label}</td>
              <td className="px-4 py-2 text-zinc-600">
                {row.value !== null && row.value !== undefined ? (
                  <FormattedText text={String(row.value)} />
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export function MarketReportView({
  title,
  ticker,
  status,
  reportData,
  marketData,
  accent,
  filenameBase,
  isPending,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // market_report JSON object
  marketData: any; // market_data JSON object
  accent?: string;
  filenameBase: string;
  isPending?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const analysis = reportData?.analysis || reportData || {};
  const data = marketData?.data || {};

  const getMetric = (index: string, key: string) => {
    const val = data[index]?.data?.[key];
    return typeof val === 'number' ? val.toFixed(2) + '%' : val;
  };

  return (
    <div ref={containerRef} className="mx-auto max-w-[920px]">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm w-fit">
            {accent && <div className="h-2 w-2 rounded-full" style={{ background: accent }} />}
            <span className="font-mono text-[11px] font-medium text-zinc-600 tracking-wider uppercase">
              {sanitizeTickerSymbol(ticker)} · {status}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h2>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-5 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] mb-6 relative overflow-hidden">
        <div className="relative z-10 space-y-6">
        
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. MARKET REGIME</h3>
          <AnalysisTextSection
            content={analysis.regime}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. US INDICES (S&P 500, NASDAQ)</h3>
          <MetricTable rows={[
            { label: "S&P 500 10D Momentum", value: getMetric("GSPC", "10d_pct_change") },
            { label: "S&P 500 Quarterly", value: getMetric("GSPC", "quarterly_pct_change") },
            { label: "NASDAQ 10D Momentum", value: getMetric("IXIC", "10d_pct_change") },
            { label: "NASDAQ Quarterly", value: getMetric("IXIC", "quarterly_pct_change") }
          ]} />
          <AnalysisTextSection
            content={analysis.us_indices}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. INDIAN INDICES (NIFTY 50, SENSEX)</h3>
          <MetricTable rows={[
            { label: "NIFTY 50 10D Momentum", value: getMetric("NSEI", "10d_pct_change") },
            { label: "NIFTY 50 Quarterly", value: getMetric("NSEI", "quarterly_pct_change") },
            { label: "SENSEX 10D Momentum", value: getMetric("BSESN", "10d_pct_change") },
            { label: "SENSEX Quarterly", value: getMetric("BSESN", "quarterly_pct_change") }
          ]} />
          <AnalysisTextSection
            content={analysis.indian_indices}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. GLOBAL-DOMESTIC CORRELATION</h3>
          <AnalysisTextSection
            content={analysis.correlation}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. VOLATILITY & RISK SENTIMENT</h3>
          <MetricTable rows={[
            { label: "VIX 10D Momentum", value: getMetric("VIX", "10d_pct_change") },
            { label: "VIX Quarterly", value: getMetric("VIX", "quarterly_pct_change") }
          ]} />
          <AnalysisTextSection
            content={analysis.volatility}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">6. MARKET OUTLOOK</h3>
          <AnalysisTextSection
            content={analysis.outlook}
            isPending={isPending}
          />
        </section>

        </div>
      </div>
      {children}
    </div>
  );
}
