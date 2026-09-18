import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Scale, AlertCircle, Zap, Target, ArrowUpRight, ArrowDownRight, Clock, ShieldAlert, Rocket, ShieldCheck, Activity, Layers, TrendingUp, TrendingDown } from "lucide-react";
import type { Verdict } from "@/lib/api";
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea } from "recharts";
import { DebateArenaLoader } from "@/components/research/DebateArenaLoader";
import { sanitizeTickerSymbol, sanitizeDecision, sanitizePriceValue, sanitizeCleanText } from "@/lib/sanitizer";
import { FormattedText } from "@/components/ui/FormattedText";

export const VerdictActionChart = memo(function VerdictActionChart({ 
  entry, 
  exit, 
  stop, 
  decision, 
  chartsData,
  technicalData,
}: { 
  entry: string; 
  exit: string; 
  stop: string; 
  decision: string;
  chartsData: any;
  technicalData?: any;
}) {
  const parsePrice = (str: any) => {
    if (str === null || str === undefined) return null;
    if (typeof str === "number") return isNaN(str) ? null : str;
    const cleaned = String(str).replace(/,/g, "").trim();
    if (cleaned.toUpperCase() === "N/A" || cleaned === "-" || cleaned === "") return null;
    const match = cleaned.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };
  
  const history = chartsData?.technical_history || [];
  const priceLevels = technicalData?.price_levels || {};

  const lastClose = history.length > 0 ? history[history.length - 1].close : null;
  const cmp = (typeof lastClose === "number" && !isNaN(lastClose)) ? lastClose : parsePrice(priceLevels.current);

  const s1Val = parsePrice(priceLevels.support_1);
  const s2Val = parsePrice(priceLevels.support_2);
  const r1Val = parsePrice(priceLevels.resistance_1);
  const r2Val = parsePrice(priceLevels.resistance_2);

  const s1Zone = priceLevels.supports?.[0]?.zone;
  const r1Zone = priceLevels.resistances?.[0]?.zone;

  const rawEntry = parsePrice(entry);
  const rawExit = parsePrice(exit);
  const rawStop = parsePrice(stop);

  const isBuy = decision === "BUY";
  const isSell = decision === "SELL";
  const isHold = decision === "HOLD" || (!isBuy && !isSell);

  // 1. BUY Mode Parameters: R1 (Tactical T1) + R2 (Extended Runner T2)
  const buyEntry = rawEntry || cmp;
  const buyTarget1 = rawExit || r1Val || (buyEntry ? buyEntry * 1.05 : null);
  const buyTarget2 = r2Val || (buyTarget1 ? buyTarget1 * 1.06 : (buyEntry ? buyEntry * 1.12 : null));
  const buyStop = rawStop || (s1Zone ? s1Zone.low : s1Val) || (buyEntry ? buyEntry * 0.96 : null);

  const buyUpsideT1Pct = (buyEntry && buyTarget1) ? ((buyTarget1 - buyEntry) / buyEntry) * 100 : null;
  const buyUpsideT2Pct = (buyEntry && buyTarget2) ? ((buyTarget2 - buyEntry) / buyEntry) * 100 : null;
  const buyDownsidePct = (buyEntry && buyStop) ? ((buyEntry - buyStop) / buyEntry) * 100 : null;
  const buyRR = (buyUpsideT2Pct && buyDownsidePct && buyDownsidePct > 0)
    ? (buyUpsideT2Pct / buyDownsidePct).toFixed(1)
    : ((buyUpsideT1Pct && buyDownsidePct && buyDownsidePct > 0) ? (buyUpsideT1Pct / buyDownsidePct).toFixed(1) : null);

  // 2. SELL Mode Parameters: S1 (Immediate Floor) + S2 (Capitulation Downside Target)
  const sellExit = rawEntry || cmp;
  const sellS1Floor = rawExit || s1Val || (sellExit ? sellExit * 0.98 : null);
  const sellS2Target = s2Val || (sellS1Floor ? sellS1Floor * 0.95 : (sellExit ? sellExit * 0.92 : null));
  const sellCeiling = rawStop || r1Val || (sellExit ? sellExit * 1.02 : null);

  const sellDownsideS1Pct = (sellExit && sellS1Floor) ? ((sellExit - sellS1Floor) / sellExit) * 100 : null;
  const sellDownsideS2Pct = (sellExit && sellS2Target) ? ((sellExit - sellS2Target) / sellExit) * 100 : null;
  const sellCeilingDistancePct = (sellExit && sellCeiling) ? ((sellCeiling - sellExit) / sellExit) * 100 : null;

  // 3. HOLD Mode Parameters: Only S1 (Floor) + R1 (Ceiling) - no S2/R2
  const holdCurrent = cmp || rawEntry;
  const holdBreakoutTarget = rawExit || r1Val || (holdCurrent ? holdCurrent * 1.04 : null);
  const holdBreakdownFloor = rawStop || s1Val || (holdCurrent ? holdCurrent * 0.96 : null);

  const holdChannelSpanPct = (holdBreakdownFloor && holdBreakoutTarget) ? ((holdBreakoutTarget - holdBreakdownFloor) / holdBreakdownFloor) * 100 : null;
  const holdUpsidePct = (holdCurrent && holdBreakoutTarget) ? ((holdBreakoutTarget - holdCurrent) / holdCurrent) * 100 : null;
  const holdDownsidePct = (holdCurrent && holdBreakdownFloor) ? ((holdCurrent - holdBreakdownFloor) / holdCurrent) * 100 : null;

  const chartBounds = useMemo(() => {
    const historyPrices = history.map((d: any) => d.close).filter((c: any) => typeof c === "number" && !isNaN(c));
    const activePoints = [
      cmp,
      buyEntry,
      buyTarget1,
      buyTarget2,
      buyStop,
      sellExit,
      sellS1Floor,
      sellS2Target,
      sellCeiling,
      holdCurrent,
      holdBreakoutTarget,
      holdBreakdownFloor,
      s1Val,
      s2Val,
      r1Val,
      r2Val,
      s1Zone?.low,
      s1Zone?.high,
      r1Zone?.low,
      r1Zone?.high,
    ].filter((v): v is number => typeof v === "number" && !isNaN(v) && v > 0);

    const allPrices = [...historyPrices, ...activePoints];
    if (allPrices.length === 0) return null;

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = Math.max((maxPrice - minPrice) * 0.16, 12);
    return { minPrice, maxPrice, padding };
  }, [history, cmp, buyEntry, buyTarget1, buyTarget2, buyStop, sellExit, sellS1Floor, sellS2Target, sellCeiling, holdCurrent, holdBreakoutTarget, holdBreakdownFloor, s1Val, s2Val, r1Val, r2Val, s1Zone, r1Zone]);

  if (history.length === 0 && !chartBounds) {
    return <div className="p-4 text-center text-zinc-500 text-sm">Insufficient chart data available</div>;
  }

  const { minPrice, maxPrice, padding } = chartBounds || { minPrice: 100, maxPrice: 200, padding: 10 };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderRefBadge = (
    title: string,
    shortTitle: string,
    price: number | string,
    theme: {
      border: string;
      text: string;
    },
    position: "left" | "right",
    verticalOffset: number = 0
  ) => {
    return function CustomRefBadge(props: any): React.ReactElement<SVGElement> {
      const { viewBox } = props;
      if (!viewBox) return <g />;
      const { x = 0, y = 0, width = 0 } = viewBox;
      if (typeof y !== "number" || isNaN(y) || typeof x !== "number" || isNaN(x)) return <g />;

      // Dynamic responsive layout based on actual SVG plot width
      const isCompact = width < 460;
      const displayTitle = isCompact ? shortTitle : title;
      const formattedPrice = typeof price === "number" ? `₹${price.toFixed(1)}` : price;
      const labelText = `${displayTitle}: ${formattedPrice}`;
      
      const charWidth = isCompact ? 6.4 : 7.2;
      const hPadding = isCompact ? 14 : 20;
      const badgeW = Math.max(labelText.length * charWidth + hPadding, isCompact ? 68 : 105);
      const badgeH = isCompact ? 20 : 22;

      const edgeMargin = isCompact ? 6 : 12;
      let badgeX = x + edgeMargin;
      if (position === "right") {
        badgeX = x + width - badgeW - edgeMargin;
      }

      const effectiveOffset = isCompact ? (verticalOffset > 0 ? 13 : verticalOffset < 0 ? -13 : 0) : verticalOffset;
      const badgeY = y - (badgeH / 2) + effectiveOffset;

      return (
        <g className="select-none pointer-events-none" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.12))" }}>
          <rect
            x={badgeX}
            y={badgeY}
            width={badgeW}
            height={badgeH}
            rx={4}
            fill="#ffffff"
            stroke={theme.border}
            strokeWidth={1.5}
          />
          <text
            x={badgeX + badgeW / 2}
            y={badgeY + (isCompact ? 13.5 : 14.5)}
            textAnchor="middle"
            fill={theme.text}
            fontSize={isCompact ? 9.5 : 10.5}
            fontWeight={700}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          >
            {labelText}
          </text>
        </g>
      );
    };
  };

  return (
    <div className="w-full mt-4 mb-2">
      {/* Verdict Strategic Metrics Banner */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 px-4 py-2.5 text-[12px]">
        {isBuy && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">ASYMMETRIC EDGE:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md">
                R:R {buyRR ? `1 : ${buyRR}` : "Favorable"}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px]">
              <span className="text-emerald-700 font-semibold">T2 (R2): +{buyUpsideT2Pct?.toFixed(1) ?? "—"}%</span>
              <span className="text-emerald-600 hidden sm:inline">T1 (R1): +{buyUpsideT1Pct?.toFixed(1) ?? "—"}%</span>
              <span className="text-rose-600">Max Risk: -{buyDownsidePct?.toFixed(1) ?? "—"}%</span>
            </div>
          </>
        )}

        {isSell && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">CAPITAL DEFENSE:</span>
              <span className="font-semibold text-rose-700 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-md">
                Drawdown Mitigation
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px]">
              <span className="text-rose-600 font-semibold">Downside (S2): -{sellDownsideS2Pct?.toFixed(1) ?? "—"}%</span>
              <span className="text-amber-600 hidden sm:inline">S1 Floor: -{sellDownsideS1Pct?.toFixed(1) ?? "—"}%</span>
              {sellCeiling && <span className="text-zinc-500 hidden sm:inline">Ceiling (R1): ₹{sellCeiling.toFixed(0)}</span>}
            </div>
          </>
        )}

        {isHold && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">MARKET STATE:</span>
              <span className="font-semibold text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-md">
                Range-Bound Consolidation
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px]">
              <span className="text-zinc-600">Range: {holdChannelSpanPct?.toFixed(1) ?? "—"}%</span>
              <span className="text-indigo-600">Breakout (&gt; R1): ₹{holdBreakoutTarget?.toFixed(0) ?? "—"}</span>
              <span className="text-amber-600 hidden sm:inline">Breakdown (&lt; S1): ₹{holdBreakdownFloor?.toFixed(0) ?? "—"}</span>
            </div>
          </>
        )}
      </div>

      {/* Chart Strategic Reference Legend */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2.5 px-0.5 font-mono text-[10.5px] sm:text-[11px]">
        {isSell && (
          <>
            <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-rose-700 shadow-2xs">
              <span className="w-2.5 sm:w-3 h-0.5 bg-rose-500 inline-block rounded" />
              <span className="font-semibold">Exit / CMP:</span> ₹{sellExit?.toFixed(1)}
            </div>
            {sellS1Floor && (
              <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-amber-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
                <span className="font-semibold">Floor (S1):</span> ₹{sellS1Floor?.toFixed(1)}{sellDownsideS1Pct ? ` (-${sellDownsideS1Pct.toFixed(1)}%)` : ""}
              </div>
            )}
            {sellS2Target && (
              <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-300/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-rose-800 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dotted border-rose-600 inline-block" />
                <span className="font-semibold">Target (S2):</span> ₹{sellS2Target?.toFixed(1)}{sellDownsideS2Pct ? ` (-${sellDownsideS2Pct.toFixed(1)}%)` : ""}
              </div>
            )}
            {sellCeiling && (
              <div className="flex items-center gap-1.5 bg-zinc-100/80 border border-zinc-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-zinc-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dotted border-zinc-500 inline-block" />
                <span className="font-semibold">Ceiling (R1):</span> ₹{sellCeiling.toFixed(1)}
              </div>
            )}
          </>
        )}
        {isBuy && (
          <>
            <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-amber-700 shadow-2xs">
              <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
              <span className="font-semibold">Entry:</span> ₹{buyEntry?.toFixed(1)}
            </div>
            {buyTarget1 && (
              <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-emerald-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 bg-emerald-500 inline-block rounded" />
                <span className="font-semibold">T1 (R1):</span> ₹{buyTarget1?.toFixed(1)}{buyUpsideT1Pct ? ` (+${buyUpsideT1Pct.toFixed(1)}%)` : ""}
              </div>
            )}
            {buyTarget2 && (
              <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-emerald-800 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dotted border-emerald-600 inline-block" />
                <span className="font-semibold">T2 (R2):</span> ₹{buyTarget2?.toFixed(1)}{buyUpsideT2Pct ? ` (+${buyUpsideT2Pct.toFixed(1)}%)` : ""}
              </div>
            )}
            {buyStop && (
              <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-rose-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dotted border-rose-500 inline-block" />
                <span className="font-semibold">Stop Loss:</span> ₹{buyStop?.toFixed(1)}{buyDownsidePct ? ` (-${buyDownsidePct.toFixed(1)}%)` : ""}
              </div>
            )}
          </>
        )}
        {isHold && (
          <>
            {holdCurrent && (
              <div className="flex items-center gap-1.5 bg-sky-50/80 border border-sky-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-sky-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 bg-sky-500 inline-block rounded" />
                <span className="font-semibold">CMP:</span> ₹{holdCurrent?.toFixed(1)}
              </div>
            )}
            {holdBreakoutTarget && (
              <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-indigo-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dashed border-indigo-500 inline-block" />
                <span className="font-semibold">Breakout (R1):</span> &gt; ₹{holdBreakoutTarget?.toFixed(1)}
              </div>
            )}
            {holdBreakdownFloor && (
              <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-amber-700 shadow-2xs">
                <span className="w-2.5 sm:w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
                <span className="font-semibold">Breakdown (S1):</span> &lt; ₹{holdBreakdownFloor?.toFixed(1)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chart Visualizer */}
      <div className="w-full h-[310px] sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={history} margin={{ top: 35, right: 15, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isBuy ? "#10b981" : isSell ? "#f43f5e" : "#6366f1"} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isBuy ? "#10b981" : isSell ? "#f43f5e" : "#6366f1"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate} 
              stroke="#a1a1aa" 
              fontSize={10} 
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis 
              domain={[minPrice - padding, maxPrice + padding]} 
              stroke="#a1a1aa" 
              fontSize={10}
              tickFormatter={(val) => `${val.toFixed(0)}`}
              width={44}
            />
            <Tooltip 
              labelFormatter={formatDate}
              formatter={(value: any) => [typeof value === "number" ? `₹${value.toFixed(2)}` : (value ?? "—"), "Price"]}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            />
            
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke={isBuy ? "#10b981" : isSell ? "#f43f5e" : "#6366f1"} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorClose)" 
              isAnimationActive={false}
            />

            {/* S1 & R1 Structural Confluence Halo Zones */}
            {s1Zone && typeof s1Zone.low === "number" && typeof s1Zone.high === "number" && s1Zone.low > 0 && s1Zone.high > s1Zone.low && (
              <ReferenceArea
                y1={s1Zone.low}
                y2={s1Zone.high}
                fill="#10b981"
                fillOpacity={0.08}
              />
            )}
            {r1Zone && typeof r1Zone.low === "number" && typeof r1Zone.high === "number" && r1Zone.low > 0 && r1Zone.high > r1Zone.low && (
              <ReferenceArea
                y1={r1Zone.low}
                y2={r1Zone.high}
                fill="#f43f5e"
                fillOpacity={0.08}
              />
            )}

            {/* BUY Visuals */}
            {isBuy && buyEntry && (
              <ReferenceLine 
                y={buyEntry} 
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={renderRefBadge("ENTRY", "ENTRY", buyEntry, { border: "#f59e0b", text: "#b45309" }, "left", 0)}
              />
            )}
            {isBuy && buyTarget1 && (
              <ReferenceLine 
                y={buyTarget1} 
                stroke="#10b981"
                strokeWidth={2}
                label={renderRefBadge("TARGET 1 (R1)", "R1", buyTarget1, { border: "#10b981", text: "#047857" }, "right", -15)}
              />
            )}
            {isBuy && buyTarget2 && (
              <ReferenceLine 
                y={buyTarget2} 
                stroke="#059669"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={renderRefBadge("TARGET 2 (R2)", "R2", buyTarget2, { border: "#059669", text: "#065f46" }, "right", -15)}
              />
            )}
            {isBuy && buyStop && (
              <ReferenceLine 
                y={buyStop} 
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={renderRefBadge("STOP LOSS", "SL", buyStop, { border: "#f43f5e", text: "#e11d48" }, "right", 15)}
              />
            )}
            {isBuy && buyStop && buyEntry && (
              <ReferenceArea y1={buyStop} y2={buyEntry} fill="#f43f5e" fillOpacity={0.05} />
            )}
            {isBuy && buyEntry && buyTarget1 && (
              <ReferenceArea y1={buyEntry} y2={buyTarget1} fill="#10b981" fillOpacity={0.06} />
            )}
            {isBuy && buyTarget1 && buyTarget2 && (
              <ReferenceArea y1={buyTarget1} y2={buyTarget2} fill="#10b981" fillOpacity={0.03} />
            )}

            {/* SELL Visuals */}
            {isSell && sellExit && (
              <ReferenceLine 
                y={sellExit} 
                stroke="#f43f5e"
                strokeWidth={2}
                label={renderRefBadge("EXIT / CMP", "EXIT", sellExit, { border: "#f43f5e", text: "#e11d48" }, "left", 0)}
              />
            )}
            {isSell && sellCeiling && (
              <ReferenceLine 
                y={sellCeiling} 
                stroke="#71717a"
                strokeDasharray="3 3"
                label={renderRefBadge("CEILING (R1)", "R1", sellCeiling, { border: "#71717a", text: "#3f3f46" }, "right", -15)}
              />
            )}
            {isSell && sellS1Floor && (
              <ReferenceLine 
                y={sellS1Floor} 
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={renderRefBadge("FLOOR (S1)", "S1", sellS1Floor, { border: "#f59e0b", text: "#b45309" }, "right", 15)}
              />
            )}
            {isSell && sellS2Target && (
              <ReferenceLine 
                y={sellS2Target} 
                stroke="#e11d48"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={renderRefBadge("TARGET (S2)", "S2", sellS2Target, { border: "#e11d48", text: "#9f1239" }, "right", 15)}
              />
            )}
            {isSell && sellS1Floor && sellExit && (
              <ReferenceArea y1={sellS1Floor} y2={sellExit} fill="#f59e0b" fillOpacity={0.05} />
            )}
            {isSell && sellS2Target && sellS1Floor && (
              <ReferenceArea y1={sellS2Target} y2={sellS1Floor} fill="#f43f5e" fillOpacity={0.07} />
            )}

            {/* HOLD Visuals */}
            {isHold && holdCurrent && (
              <ReferenceLine 
                y={holdCurrent} 
                stroke="#0284c7"
                strokeWidth={2}
                label={renderRefBadge("CMP", "CMP", holdCurrent, { border: "#0284c7", text: "#0369a1" }, "left", 0)}
              />
            )}
            {isHold && holdBreakoutTarget && (
              <ReferenceLine 
                y={holdBreakoutTarget} 
                stroke="#4f46e5"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={renderRefBadge("BREAKOUT (> R1)", "R1", holdBreakoutTarget, { border: "#4f46e5", text: "#4338ca" }, "right", -15)}
              />
            )}
            {isHold && holdBreakdownFloor && (
              <ReferenceLine 
                y={holdBreakdownFloor} 
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={renderRefBadge("BREAKDOWN (< S1)", "S1", holdBreakdownFloor, { border: "#f59e0b", text: "#b45309" }, "right", 15)}
              />
            )}
            {isHold && holdBreakdownFloor && holdBreakoutTarget && (
              <ReferenceArea y1={holdBreakdownFloor} y2={holdBreakoutTarget} fill="#6366f1" fillOpacity={0.05} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export function ManagerVerdictView({
  ticker,
  data,
  chartsData,
  technicalData,
  isAnalyzing = false,
  onTriggerDebate,
  debateLoading = false,
  debateError,
}: {
  ticker: string;
  data?: Verdict | null;
  chartsData?: any;
  technicalData?: any;
  isAnalyzing?: boolean;
  onTriggerDebate?: () => void;
  debateLoading?: boolean;
  debateError?: string | null;
}) {
  if (!data && debateLoading) {
    return <DebateArenaLoader ticker={ticker} />;
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
        <div className="flex max-w-md flex-col items-center gap-4">
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Scale className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <h3 className="font-mono text-[13px] font-bold tracking-widest text-zinc-900 uppercase">
            Manager Verdict Not Formulated
          </h3>
          <p className="text-[14px] leading-relaxed text-zinc-500">
            The Research Manager synthesizes findings from the 5 specialist analysts and the Bull vs. Bear debate to deliver actionable Buy/Sell/Hold verdicts with entry prices and price targets.
          </p>
          {debateError && (
            <p className="text-[12px] text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              {debateError}
            </p>
          )}
          {onTriggerDebate && (
            <button
              onClick={onTriggerDebate}
              disabled={debateLoading || isAnalyzing}
              className={`mt-2 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 text-[13px] font-semibold transition-all shadow-md ${
                isAnalyzing
                  ? "opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none"
                  : "hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              }`}
              title={isAnalyzing ? "Analysis in progress. Specialist research compiling..." : "Generate Debate & Final Verdict"}
            >
              {isAnalyzing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Waiting for Specialist Reports...</span>
                </>
              ) : debateLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Synthesizing Executive Verdict...</span>
                </>
              ) : (
                <>
                  <Scale size={16} />
                  <span>Generate Debate & Final Verdict</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (data.status === "failure") {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-sm">
        <div className="flex max-w-md flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="font-mono text-[13px] font-bold tracking-widest text-red-600">
            VERDICT FAILED
          </h3>
          <p className="text-[14px] leading-relaxed text-red-800/80">
            {data.rationale || "The manager encountered an error while formulating the verdict."}
          </p>
        </div>
      </div>
    );
  }

  const decision = sanitizeDecision(data.decision);
  const isBuy = decision === "BUY";
  const isSell = decision === "SELL";

  const decisionColor = isBuy
    ? "text-emerald-600"
    : isSell
      ? "text-rose-600"
      : "text-amber-600";

  const decisionBg = isBuy
    ? "from-emerald-50 to-emerald-100/50 border-emerald-200"
    : isSell
      ? "from-rose-50 to-rose-100/50 border-rose-200"
      : "from-amber-50 to-amber-100/50 border-amber-200";

  return (
    <div className="mx-auto max-w-[920px] min-h-full rounded-[2rem] bg-white p-4 sm:p-8 text-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04]">
      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.2)] border border-amber-500/20"
          >
            <Scale className="h-8 w-8 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="mb-3 flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-50 px-4 py-1.5">
              <span className="font-mono text-[12px] font-medium text-amber-700 tracking-wider">
                {sanitizeTickerSymbol(ticker)} · MANAGER VERDICT
              </span>
            </div>

            <div className={`mt-4 rounded-3xl border bg-gradient-to-b ${decisionBg} px-10 py-6`}>
              <h1 className={`text-5xl font-black tracking-tight ${decisionColor} drop-shadow-md`}>
                {decision}
              </h1>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-[14px] font-medium text-zinc-600">Confidence</span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.round(data.confidence * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[14px] font-bold text-zinc-900">
                  {Math.round(data.confidence * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-6 sm:p-8 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-mono text-[12px] font-bold tracking-widest text-zinc-500">
              {isBuy
                ? "BULLISH TRADE ARCHITECTURE & RISK/REWARD SETUP"
                : isSell
                  ? "CAPITAL PRESERVATION & DOWNTURN EXPOSURE MAP"
                  : "CONSOLIDATION CORRIDOR & BREAKOUT TRIGGERS"}
            </h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-50/80 p-4 border border-zinc-100 shadow-sm">
              <Target className="mb-2 h-5 w-5 text-zinc-400" />
              <span className="mb-1 font-mono text-[10px] font-bold tracking-widest text-zinc-500">
                {isBuy ? "ENTRY" : isSell ? "CURRENT EXIT / CMP" : "CURRENT POSITION"}
              </span>
              <span className="text-[16px] font-semibold text-zinc-900">{sanitizePriceValue(data.entry_price, "-")}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-50/50 p-4 border border-emerald-100 shadow-sm">
              <ArrowUpRight className="mb-2 h-5 w-5 text-emerald-500" />
              <span className="mb-1 font-mono text-[10px] font-bold tracking-widest text-emerald-600/70">
                {isBuy ? "TARGET" : isSell ? "RE-ENTRY WATCH (S1)" : "BREAKOUT TARGET (> R1)"}
              </span>
              <span className="text-[16px] font-semibold text-emerald-700">{sanitizePriceValue(data.exit_price, "-")}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center rounded-xl bg-rose-50/50 p-4 border border-rose-100 shadow-sm">
              <ArrowDownRight className="mb-2 h-5 w-5 text-rose-500" />
              <span className="mb-1 font-mono text-[10px] font-bold tracking-widest text-rose-600/70">
                {isBuy ? "STOP LOSS" : isSell ? "RESISTANCE CEILING (R1)" : "BREAKDOWN STOP (< S1)"}
              </span>
              <span className="text-[16px] font-semibold text-rose-700">{sanitizePriceValue(data.stop_loss, "-")}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100/80">
            <VerdictActionChart 
              entry={sanitizePriceValue(data.entry_price, "")} 
              exit={sanitizePriceValue(data.exit_price, "")} 
              stop={sanitizePriceValue(data.stop_loss, "")} 
              decision={decision}
              chartsData={chartsData}
              technicalData={technicalData}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8 shadow-sm"
        >
          <h3 className="mb-4 font-mono text-[12px] font-bold tracking-widest text-amber-600">RATIONALE</h3>
          <p className="mb-6 text-[16px] leading-relaxed text-zinc-700">
            <FormattedText text={data.rationale || ""} />
          </p>

          <h3 className="mb-4 font-mono text-[12px] font-bold tracking-widest text-amber-600">STRATEGY</h3>
          <div className="flex items-start gap-4">
            <div className="mt-1 flex shrink-0 items-center justify-center rounded-full bg-white border border-amber-200 p-2 shadow-sm">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[15px] leading-relaxed text-zinc-700">
                <FormattedText text={data.strategy || ""} />
              </p>
              <p className="mt-2 font-mono text-[12px] text-zinc-500">
                Horizon: <span className="text-zinc-800 font-semibold">{sanitizeCleanText(data.hold_duration || "Swing")}</span>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-emerald-500" />
                <h3 className="font-mono text-[12px] font-bold tracking-widest text-zinc-600">CATALYSTS</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${data.bull_strength === 'strong' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                  data.bull_strength === 'moderate' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}>
                {data.bull_strength} bull
              </span>
            </div>
            <ul className="space-y-3">
              {data.key_catalysts?.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-zinc-600">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span><FormattedText text={c} /></span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                <h3 className="font-mono text-[12px] font-bold tracking-widest text-zinc-600">RISKS</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${data.bear_strength === 'strong' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                  data.bear_strength === 'moderate' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}>
                {data.bear_strength} bear
              </span>
            </div>
            <ul className="space-y-3">
              {data.key_risks?.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-zinc-600">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span><FormattedText text={r} /></span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
