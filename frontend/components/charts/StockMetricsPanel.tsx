"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface PricePoint {
  label: string;
  price: number;
  dateStr: string;
}

interface StockMetricsPanelProps {
  data: any;
}

export function StockMetricsPanel({ data }: StockMetricsPanelProps) {
  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M" | "1Y">("1M");
  const [showFullSummary, setShowFullSummary] = useState(false);

  const info = data.company_info || {};
  const history = data.historical_prices || [];

  const tickerSymbol = (info.symbol || data.ticker || "TICKER").split(".")[0];
  const companyName = info.longName || info.shortName || tickerSymbol;
  const currency = info.currency || "INR";

  const techData = data.technical_data || {};
  const priceLevels = techData.price_levels || {};
  const techVolume = techData.volume || {};

  // Base metrics with robust fallbacks to technical_data and history
  const prevClose = parseFloat(info.previousClose || info.regularMarketPreviousClose || (history.length > 1 ? history[history.length - 2].close : "0"));
  const openPrice = parseFloat(info.open || info.regularMarketOpen || (history.length > 0 ? history[history.length - 1].open : "0"));
  const dayHigh = parseFloat(info.dayHigh || info.regularMarketDayHigh || (history.length > 0 ? history[history.length - 1].high : "0"));
  const dayLow = parseFloat(info.dayLow || info.regularMarketDayLow || (history.length > 0 ? history[history.length - 1].low : "0"));
  const currentPrice = parseFloat(
    info.currentPrice ||
      info.regularMarketPrice ||
      priceLevels.current ||
      (history.length > 0 ? history[history.length - 1].close : "0")
  );

  const mktCap = info.marketCap;
  const peRatio = info.trailingPE || info.forwardPE;
  const volume = info.volume || info.regularMarketVolume || techVolume.latest || (history.length > 0 ? history[history.length - 1].volume : null);
  const fiftyTwoWeekHigh = info.fiftyTwoWeekHigh || priceLevels.high_52w;
  const fiftyTwoWeekLow = info.fiftyTwoWeekLow || priceLevels.low_52w;

  const sector = info.sector || "N/A";
  const industry = info.industry || "N/A";
  const businessSummary = info.longBusinessSummary || info.description || "No business summary available.";

  const bulletPoints = useMemo(() => {
    if (!businessSummary || businessSummary === "No business summary available.") {
      return ["No business summary available."];
    }
    const sentences = businessSummary
      .split(/(?<!\b(?:Dr|Mr|Ms|Co|Inc|Ltd|Rs|No|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\.\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 3);

    return sentences.map((s: string) => {
      if (s.endsWith(".")) return s;
      return s + ".";
    });
  }, [businessSummary]);

  // Calculate change and percentage change relative to baseline
  const { priceChange, percentChange, isPositive } = useMemo(() => {
    let baseline = prevClose;
    let current = currentPrice;

    if (history.length > 0) {
      const latestDate = new Date(history[history.length - 1].date);
      const getLimitDate = (months: number) => {
        const d = new Date(latestDate);
        d.setMonth(d.getMonth() - months);
        return d;
      };

      let slice: any[] = [];
      if (timeframe === "1M") {
        slice = history.filter((p: any) => new Date(p.date) >= getLimitDate(1));
      } else if (timeframe === "3M") {
        slice = history.filter((p: any) => new Date(p.date) >= getLimitDate(3));
      } else if (timeframe === "6M") {
        slice = history.filter((p: any) => new Date(p.date) >= getLimitDate(6));
      } else {
        slice = history; // 1Y
      }

      if (slice.length > 0) {
        baseline = slice[0].close;
        current = slice[slice.length - 1].close;
      }
    }

    const change = current - baseline;
    const pct = baseline > 0 ? (change / baseline) * 100 : 0;
    return {
      priceChange: change,
      percentChange: pct,
      isPositive: change >= 0,
    };
  }, [timeframe, prevClose, currentPrice, history]);

  // Construct chart data based on selected timeframe
  const chartData = useMemo(() => {
    let filtered = [...history];

    if (history.length > 0) {
      const latestDate = new Date(history[history.length - 1].date);
      const getLimitDate = (months: number) => {
        const d = new Date(latestDate);
        d.setMonth(d.getMonth() - months);
        return d;
      };

      if (timeframe === "1M") {
        filtered = history.filter((p: any) => new Date(p.date) >= getLimitDate(1));
      } else if (timeframe === "3M") {
        filtered = history.filter((p: any) => new Date(p.date) >= getLimitDate(3));
      } else if (timeframe === "6M") {
        filtered = history.filter((p: any) => new Date(p.date) >= getLimitDate(6));
      }
    }

    // Downsample if dataset is too large (keep max 100 points for smooth rendering)
    if (filtered.length > 100) {
      const step = Math.ceil(filtered.length / 100);
      filtered = filtered.filter((_, idx) => idx % step === 0);
    }

    return filtered.map((pt: any) => {
      const date = new Date(pt.date);
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        label: formattedDate,
        price: parseFloat((pt.close || pt.price).toFixed(2)),
        dateStr: date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    });
  }, [timeframe, history]);

  // Format Helpers
  const formatValue = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val) || val === 0) return "N/A";
    return val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatMarketCap = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val) || val === 0) return "N/A";
    if (val >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e7) return `${(val / 1e7).toFixed(2)}Cr`;
    if (val >= 1e5) return `${(val / 1e5).toFixed(2)}L`;
    return val.toLocaleString("en-IN");
  };

  const formatVolume = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val) || val === 0) return "N/A";
    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toLocaleString("en-IN");
  };

  // Determine line color and baseline
  const strokeColor = isPositive ? "#22c55e" : "#ef4444";
  const fillColor = isPositive ? "rgba(34, 197, 94, 0.04)" : "rgba(239, 68, 68, 0.04)";
  
  // Baseline reference is previous close for 1D, or the first price point for others
  const baselinePrice = chartData[0]?.price || prevClose;

  // Time stamp string
  const timeString = `Historical prices up to ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <div className="mx-auto max-w-[920px] rounded-2xl border border-[var(--border)] bg-white p-4 md:p-6 shadow-sm">
      
      {/* Ticker & Price Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-wider text-zinc-700 border border-zinc-200 bg-zinc-50 px-2 py-0.5 rounded uppercase">
              NSE: {tickerSymbol}
            </span>
            <span className="text-sm font-medium text-zinc-400">· {currency}</span>
          </div>
          <h2 className="mt-1.5 font-sans text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 leading-none">
            {companyName}
          </h2>
          <p className="mt-2 font-mono text-[12px] text-zinc-400 uppercase tracking-wide">
            {timeString}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end">
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950">
              {formatValue(currentPrice)}
            </span>
            <span className="font-mono text-sm font-bold text-zinc-500 uppercase">{currency}</span>
          </div>
          
          <div
            className={`mt-1.5 flex items-center gap-1 font-mono text-base font-bold tracking-tight ${
              isPositive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight size={18} className="stroke-[2.5]" />
            ) : (
              <ArrowDownRight size={18} className="stroke-[2.5]" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {priceChange.toFixed(2)} ({isPositive ? "+" : ""}
              {percentChange.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Timeframe Selector Tabs */}
      <div className="mt-4 sm:mt-6 flex flex-wrap gap-1.5 sm:gap-2">
        {(["1M", "3M", "6M", "1Y"] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`rounded-lg px-2.5 sm:px-3.5 py-1 sm:py-1.5 font-sans text-[11px] sm:text-[12px] font-bold tracking-wider transition-all cursor-pointer ${
              timeframe === tf
                ? "bg-zinc-900 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
            }`}
          >
            {tf === "1M" ? "1 Month" : tf === "3M" ? "3 Months" : tf === "6M" ? "6 Months" : "1 Year"}
          </button>
        ))}
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 sm:mt-6 h-[200px] sm:h-[260px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 25, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.06} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="#a1a1aa"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
                tickLine={false}
                axisLine={false}
                dy={8}
                minTickGap={50}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#a1a1aa"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
                tickLine={false}
                axisLine={false}
                dx={-8}
                tickCount={5}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const pt = payload[0].payload as PricePoint;
                    return (
                      <div className="rounded-lg border border-zinc-100 bg-white p-3 shadow-md font-mono text-[12px]">
                        <p className="text-zinc-400">{pt.dateStr}</p>
                        <p className="mt-1 font-sans text-base font-bold text-zinc-950">
                          {pt.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} {currency}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {baselinePrice > 0 && (
                <ReferenceLine
                  y={baselinePrice}
                  stroke="#d4d4d8"
                  strokeDasharray="3 3"
                  label={{
                    value: `Prev close ${baselinePrice.toFixed(2)}`,
                    fill: "#71717a",
                    fontSize: 10,
                    fontFamily: "ui-monospace, monospace",
                    position: "top",
                    offset: 4
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[12px] text-zinc-400">
            No price history available.
          </div>
        )}
      </div>

      {/* Key Statistics Grid */}
      <div className="mt-8 border-t border-zinc-100 pt-6">
        <h3 className="font-sans text-xs font-extrabold uppercase tracking-widest text-zinc-400">
          Key Statistics
        </h3>
        <div className="mt-4 rounded-xl bg-zinc-50 p-4 border border-zinc-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-4 font-mono text-[13px] sm:text-[14px]">
            {[
              [
                { label: "Open", val: formatValue(openPrice) },
                { label: "High", val: formatValue(dayHigh) },
                { label: "Low", val: formatValue(dayLow) },
              ],
              [
                { label: "Mkt Cap", val: formatMarketCap(mktCap) },
                { label: "P/E ratio", val: peRatio ? peRatio.toFixed(2) : "N/A" },
                { label: "Volume", val: formatVolume(volume) },
              ],
              [
                { label: "Prev close", val: formatValue(prevClose) },
                { label: "52W high", val: formatValue(fiftyTwoWeekHigh) },
                { label: "52W low", val: formatValue(fiftyTwoWeekLow) },
              ],
            ].map((col, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-3">
                {col.map(({ label, val }) => (
                  <div key={label} className="flex border-b border-zinc-200/50 pb-1.5 last:border-b-0">
                    <span className="w-20 lg:w-22 shrink-0 text-zinc-400">{label}</span>
                    <span className="font-semibold text-zinc-900 truncate">{val}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Company Card */}
      <div className="mt-8 border-t border-zinc-100 pt-6">
        <h3 className="font-sans text-xs font-extrabold uppercase tracking-widest text-zinc-400">
          About Company
        </h3>
        
        <div className="mt-4 rounded-xl bg-zinc-50 p-4 border border-zinc-100">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-mono border-b border-zinc-200/50 pb-3 mb-3">
            <div>
              <span className="text-zinc-400 uppercase">Sector:</span>{" "}
              <span className="font-bold text-zinc-950">{sector}</span>
            </div>
            <div className="h-4 w-px bg-zinc-300 hidden sm:block" />
            <div>
              <span className="text-zinc-400 uppercase">Industry:</span>{" "}
              <span className="font-bold text-zinc-950">{industry}</span>
            </div>
          </div>

          <ul className="list-disc pl-5 space-y-2.5 font-sans text-sm leading-relaxed text-zinc-600">
            {(showFullSummary ? bulletPoints : bulletPoints.slice(0, 3)).map((bullet: string, idx: number) => (
              <li key={idx} className="marker:text-zinc-400">
                {bullet}
              </li>
            ))}
          </ul>

          {bulletPoints.length > 3 && (
            <button
              onClick={() => setShowFullSummary(!showFullSummary)}
              className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 hover:text-zinc-600 hover:underline transition-all cursor-pointer block"
            >
              {showFullSummary ? "Show Less ▲" : `Show More (${bulletPoints.length - 3} More) ▼`}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
