import React, { useRef } from "react";
import { downloadPdf } from "@/lib/download";

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

  const handleDownloadPdf = async () => {
    downloadPdf(filenameBase, JSON.stringify(reportData, null, 2));
  };

  const analysis = reportData?.analysis || {};
  const data = marketData?.data || {};

  const MetricTable = ({ rows, title }: { rows: { label: string, value: any }[], title?: string }) => (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50/30 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800 bg-zinc-50/50 w-1/3">{row.label}</td>
              <td className="px-4 py-2 text-zinc-600">{row.value !== null && row.value !== undefined ? String(row.value) : '-'}</td>
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
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-[18px] font-medium text-[var(--foreground)]">
          {accent && <span className="inline-block h-2.5 w-2.5" style={{ background: accent }} />}
          {title}
        </h2>
        <div className="flex items-center gap-4">
          <button disabled={!canDownload} onClick={handleDownloadPdf} className="flex items-center gap-1 rounded-md border border-zinc-900 bg-zinc-950 px-2.5 py-1 font-sans text-[11px] font-medium text-zinc-50 transition-all hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs cursor-pointer">
            JSON
          </button>
        </div>
      </div>
      <div className="h-px w-full bg-[var(--border)]" />
      <p className="mt-2 font-mono text-[12px] text-[var(--muted-foreground)] mb-6">
        {ticker.split(".")[0]} · Report generated · {status}
      </p>

      <div className="mt-6 border border-[var(--border)] bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm mb-6 space-y-8">
        
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. MARKET REGIME</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.regime || "No analysis available."}
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
            {analysis.us_indices || "No analysis available."}
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
            {analysis.indian_indices || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. GLOBAL-DOMESTIC CORRELATION</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.correlation || "No analysis available."}
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
            {analysis.volatility || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">6. MARKET OUTLOOK</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.outlook || "No analysis available."}
          </div>
        </section>

      </div>
      {children}
    </div>
  );
}
