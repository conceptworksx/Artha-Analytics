import React, { useRef } from "react";

import { FormattedText } from "@/components/ui/FormattedText";

export function MarketReportView({
  title,
  ticker,
  status,
  reportData,
  marketData,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // market_report JSON object
  marketData: any; // market_data JSON object
  accent?: string;
  filenameBase: string;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canDownload = Boolean(reportData);

  const handleDownloadPdf = () => {
    window.print();
  };

  const analysis = reportData?.analysis || reportData || {};
  const data = marketData?.data || {};

  const MetricTable = ({ rows, title }: { rows: { label: string, value: any }[], title?: string }) => (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800 w-1/3">{row.label}</td>
              <td className="px-4 py-2 text-zinc-600">{row.value !== null && row.value !== undefined ? <FormattedText text={String(row.value)} /> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
              {ticker.split(".")[0]} · {status}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            disabled={!canDownload}
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] px-3 py-1.5 font-sans text-[11px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            PDF
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white/40 p-5 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl border border-black/[0.04] mb-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-slate-200/30 blur-[80px]" />
        </div>
        <div className="relative z-10 space-y-6">
        
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. MARKET REGIME</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.regime || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. US INDICES (S&P 500, NASDAQ)</h3>
          <MetricTable rows={[
            { label: "S&P 500 10D Momentum", value: getMetric("GSPC", "10d_pct_change") },
            { label: "S&P 500 Quarterly", value: getMetric("GSPC", "quarterly_pct_change") },
            { label: "NASDAQ 10D Momentum", value: getMetric("IXIC", "10d_pct_change") },
            { label: "NASDAQ Quarterly", value: getMetric("IXIC", "quarterly_pct_change") }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.us_indices || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. INDIAN INDICES (NIFTY 50, SENSEX)</h3>
          <MetricTable rows={[
            { label: "NIFTY 50 10D Momentum", value: getMetric("NSEI", "10d_pct_change") },
            { label: "NIFTY 50 Quarterly", value: getMetric("NSEI", "quarterly_pct_change") },
            { label: "SENSEX 10D Momentum", value: getMetric("BSESN", "10d_pct_change") },
            { label: "SENSEX Quarterly", value: getMetric("BSESN", "quarterly_pct_change") }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.indian_indices || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. GLOBAL-DOMESTIC CORRELATION</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.correlation || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. VOLATILITY & RISK SENTIMENT</h3>
          <MetricTable rows={[
            { label: "VIX 10D Momentum", value: getMetric("VIX", "10d_pct_change") },
            { label: "VIX Quarterly", value: getMetric("VIX", "quarterly_pct_change") }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.volatility || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">6. MARKET OUTLOOK</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.outlook || "No analysis available."} />
          </div>
        </section>

        </div>
      </div>
      {children}
    </div>
  );
}
