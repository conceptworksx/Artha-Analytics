import React, { useRef } from "react";

import { FormattedText } from "@/components/ui/FormattedText";
import {
  TechnicalTrendChart,
  TechnicalVolatilityChart,
  TechnicalMomentumChart,
  type TechDataPoint,
} from "@/components/charts/TechnicalChart";

export function TechnicalReportView({
  title,
  ticker,
  status,
  reportData,
  technicalData,
  chartData,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // technical_report JSON object
  technicalData: any; // technical_data JSON object
  chartData?: TechDataPoint[];
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
            <tr key={i} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800 w-1/3">{row.label}</td>
              <td className="px-4 py-2 text-zinc-600">{row.value !== null && row.value !== undefined ? <FormattedText text={String(row.value)} /> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
        <div className="relative z-10 space-y-8">
        
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. MARKET STRUCTURE & TREND</h3>
          <TechnicalTrendChart data={chartData} />
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
            <FormattedText text={analysis.market_structure || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. VOLATILITY (BOLLINGER & ATR)</h3>
          <TechnicalVolatilityChart data={chartData} />
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
            <FormattedText text={analysis.volatility || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. MOMENTUM (RSI)</h3>
          <TechnicalMomentumChart data={chartData} />
          <MetricTable rows={[
            { label: "RSI Value", value: rsi.value },
            { label: "Condition", value: rsi.condition },
            { label: "Trending Up", value: rsi.trending_up ? 'Yes' : 'No' },
            { label: "Bull Divergence", value: rsi.bull_divergence ? 'Yes' : 'No' },
            { label: "Bear Divergence", value: rsi.bear_divergence ? 'Yes' : 'No' }
          ]} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.momentum || "No analysis available."} />
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
            <FormattedText text={analysis.macd || "No analysis available."} />
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
            <FormattedText text={analysis.volume || "No analysis available."} />
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
            <FormattedText text={analysis.price_levels || "No analysis available."} />
          </div>
        </section>
        </div>
      </div>
      {children}
    </div>
  );
}
