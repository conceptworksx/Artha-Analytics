import React, { useRef } from "react";
import { downloadPdf } from "@/lib/download";

export function TechnicalReportView({
  title,
  ticker,
  status,
  reportData,
  technicalData,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // technical_report JSON object
  technicalData: any; // technical_data JSON object
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
  const t = technicalData || {};

  const ma = t.moving_averages || {};
  const rsi = t.rsi || {};
  const macd = t.macd || {};
  const bb = t.bollinger || {};
  const atr = t.atr || {};
  const vol = t.volume || {};
  const mfi = t.mfi || {};
  const vwma = t.vwma || {};
  const pl = t.price_levels || {};

  const MetricTable = ({ rows }: { rows: { label: string, value: any }[] }) => (
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
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. MARKET STRUCTURE & TREND</h3>
          <MetricTable rows={[
            { label: "MA10", value: ma.ma10 },
            { label: "MA50", value: ma.ma50 },
            { label: "MA200", value: ma.ma200 },
            { label: "Trend Alignment", value: ma.trend_alignment },
            { label: "Golden Cross", value: ma.golden_cross ? 'Yes' : 'No' },
            { label: "VWMA (20)", value: vwma.value },
            { label: "Price vs VWMA", value: vwma.price_vs_vwma }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.market_structure || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. VOLATILITY (BOLLINGER & ATR)</h3>
          <MetricTable rows={[
            { label: "ATR Value", value: atr.value },
            { label: "ATR (%)", value: atr.atr_pct },
            { label: "Volatility Regime", value: atr.volatility },
            { label: "Bollinger Bandwidth (%)", value: bb.bandwidth_pct },
            { label: "Squeeze Active", value: bb.squeeze_active ? 'Yes' : 'No' },
            { label: "Bandwidth Trend", value: bb.bandwidth_trend }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.volatility || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. MOMENTUM (RSI)</h3>
          <MetricTable rows={[
            { label: "RSI Value", value: rsi.value },
            { label: "Condition", value: rsi.condition },
            { label: "Trending Up", value: rsi.trending_up ? 'Yes' : 'No' },
            { label: "Bull Divergence", value: rsi.bull_divergence ? 'Yes' : 'No' },
            { label: "Bear Divergence", value: rsi.bear_divergence ? 'Yes' : 'No' }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.momentum || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. MACD ANALYSIS</h3>
          <MetricTable rows={[
            { label: "MACD", value: macd.macd },
            { label: "Signal", value: macd.signal },
            { label: "Histogram", value: macd.histogram },
            { label: "Bias", value: macd.bias },
            { label: "Bullish Cross", value: macd.bullish_cross ? 'Yes' : 'No' }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.macd || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. VOLUME & MONEY FLOW</h3>
          <MetricTable rows={[
            { label: "MFI Value", value: mfi.value },
            { label: "MFI Condition", value: mfi.condition },
            { label: "Volume 5d/20d Ratio", value: vol.ratio_5d_20d },
            { label: "Volume Surge", value: vol.surge ? 'Yes' : 'No' }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.volume || "No analysis available."}
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">6. KEY PRICE LEVELS</h3>
          <MetricTable rows={[
            { label: "Current Price", value: pl.current },
            { label: "52-Week High", value: pl.high_52w },
            { label: "52-Week Low", value: pl.low_52w },
            { label: "% From 52W High", value: pl.pct_from_52w_high },
            { label: "% From 52W Low", value: pl.pct_from_52w_low }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.price_levels || "No analysis available."}
          </div>
        </section>
      </div>
      {children}
    </div>
  );
}
