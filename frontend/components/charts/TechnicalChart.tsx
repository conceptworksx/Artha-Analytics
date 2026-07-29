"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TechDataPoint {
  date: string;
  close: number | null;
  ma50: number | null;
  ma200: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  bb_mid: number | null;
  rsi: number | null;
  volume: number | null;
}

const formatDate = (val: string) => {
  try {
    const d = new Date(val);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return val;
  }
};

const CustomTooltipStyle = {
  background: "white",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontFamily: "monospace",
  fontSize: "11px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

const EmptyState = () => (
  <div className="flex h-[200px] items-center justify-center rounded-lg border border-[var(--border)] bg-zinc-50">
    <span className="font-mono text-[12px] text-[var(--muted-foreground)]">No chart data available</span>
  </div>
);

export function TechnicalTrendChart({ data }: { data?: TechDataPoint[] }) {
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="my-4 h-[220px] sm:h-[280px] w-full rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCloseTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.05} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} minTickGap={50} />
          <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} tickCount={5} />
          <Tooltip contentStyle={CustomTooltipStyle} labelFormatter={formatDate} />
          <Area name="Close" type="monotone" dataKey="close" stroke="var(--foreground)" strokeWidth={2} fillOpacity={1} fill="url(#colorCloseTrend)" />
          <Line name="SMA 50" type="monotone" dataKey="ma50" stroke="#f43f5e" strokeWidth={1.5} dot={false} activeDot={false} />
          <Line name="SMA 200" type="monotone" dataKey="ma200" stroke="#10b981" strokeWidth={1.5} dot={false} activeDot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TechnicalVolatilityChart({ data }: { data?: TechDataPoint[] }) {
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="my-4 h-[220px] sm:h-[280px] w-full rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCloseVol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.05} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} minTickGap={50} />
          <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} tickCount={5} />
          <Tooltip contentStyle={CustomTooltipStyle} labelFormatter={formatDate} />
          <Area name="BB Upper" type="monotone" dataKey="bb_upper" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" fill="none" />
          <Area name="BB Lower" type="monotone" dataKey="bb_lower" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" fill="none" />
          <Area name="Close" type="monotone" dataKey="close" stroke="var(--foreground)" strokeWidth={2} fillOpacity={1} fill="url(#colorCloseVol)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TechnicalMomentumChart({ data }: { data?: TechDataPoint[] }) {
  if (!data || data.length === 0) return <EmptyState />;

  return (
    <div className="my-4 h-[120px] sm:h-[150px] w-full rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} minTickGap={50} />
          <YAxis domain={[10, 90]} tickLine={false} axisLine={false} ticks={[30, 50, 70]} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} />
          <Tooltip contentStyle={CustomTooltipStyle} labelFormatter={formatDate} />
          <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="2 2" />
          <Line name="RSI" type="monotone" dataKey="rsi" stroke="#d97706" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
