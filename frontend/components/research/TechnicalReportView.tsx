import React, { useRef } from "react";
import { Loader2 } from "lucide-react";

import { FormattedText } from "@/components/ui/FormattedText";
import { sanitizeTickerSymbol } from "@/lib/sanitizer";
import { humanizeFieldName } from "@/lib/humanizer";
import {
  TechnicalTrendChart,
  TechnicalVolatilityChart,
  TechnicalMomentumChart,
  type TechDataPoint,
} from "@/components/charts/TechnicalChart";

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
          <span>Specialist compiling qualitative technical insights...</span>
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
}) {
  return (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800 w-1/3">{humanizeFieldName(row.label)}</td>
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

export function TechnicalReportView({
  title,
  ticker,
  status,
  reportData,
  technicalData,
  chartData,
  accent,
  filenameBase,
  isPending,
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
  isPending?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

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
          <AnalysisTextSection
            content={analysis.market_structure}
            isPending={isPending}
          />
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
          <AnalysisTextSection
            content={analysis.volatility}
            isPending={isPending}
          />
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
          <AnalysisTextSection
            content={analysis.momentum}
            isPending={isPending}
          />
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
          <AnalysisTextSection
            content={analysis.macd}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. VOLUME & MONEY FLOW</h3>
          <MetricTable rows={[
            { label: "MFI Value", value: mfi.value },
            { label: "MFI Condition", value: mfi.condition },
            { label: "Volume 5d/20d Ratio", value: vol.ratio_5d_20d },
            { label: "Volume Surge", value: vol.surge ? 'Yes' : 'No' }
          ]} />
          <AnalysisTextSection
            content={analysis.volume}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">6. KEY PRICE LEVELS</h3>
          <MetricTable rows={[
            { label: "Current Price", value: pl.current },
            { label: "52-Week High", value: pl.high_52w },
            { label: "52-Week Low", value: pl.low_52w },
            { label: "% From 52W High", value: pl.pct_from_52w_high },
            { label: "% From 52W Low", value: pl.pct_from_52w_low },
            ...(pl.support_1?.price ? [{ label: "Primary Support (S1)", value: `₹${pl.support_1.price} (${pl.support_1.strength} strength: ${pl.support_1.confluence_factors?.join(", ") || ""})` }] : []),
            ...(pl.support_2?.price ? [{ label: "Capitulation Support (S2)", value: `₹${pl.support_2.price} (${pl.support_2.strength} strength: ${pl.support_2.confluence_factors?.join(", ") || ""})` }] : []),
            ...(pl.resistance_1?.price ? [{ label: "Primary Resistance (R1)", value: `₹${pl.resistance_1.price} (${pl.resistance_1.strength} strength: ${pl.resistance_1.confluence_factors?.join(", ") || ""})` }] : []),
            ...(pl.resistance_2?.price ? [{ label: "Extended Resistance (R2)", value: `₹${pl.resistance_2.price} (${pl.resistance_2.strength} strength: ${pl.resistance_2.confluence_factors?.join(", ") || ""})` }] : []),
            ...(pl.market_structure ? [{ label: "Market Structure", value: pl.market_structure }] : []),
            ...(pl.swing_context?.direction ? [{ label: "Swing Context", value: `${pl.swing_context.direction} (from ₹${pl.swing_context.swing_low} to ₹${pl.swing_context.swing_high})` }] : []),
          ]} />
          <AnalysisTextSection
            content={analysis.price_levels}
            isPending={isPending}
          />
        </section>
        </div>
      </div>
      {children}
    </div>
  );
}
