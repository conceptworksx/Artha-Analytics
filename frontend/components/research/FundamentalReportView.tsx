import React, { useRef } from "react";
import { Loader2 } from "lucide-react";

import { FormattedText } from "@/components/ui/FormattedText";
import { sanitizeTickerSymbol } from "@/lib/sanitizer";
import { 
  FundamentalGrowthChart,
  FundamentalProfitabilityChart,
  type FinancialsHistory
} from "@/components/charts/FundamentalChart";

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
          <span>Specialist compiling qualitative fundamental insights...</span>
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
  headers,
  rows,
}: {
  headers: string[];
  rows: {
    label: string;
    values: (string | number | null)[];
    trend?: string | number | null;
  }[];
}) {
  return (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-zinc-50/50 border-b border-[var(--border)]">
          <tr>
            <th className="px-4 py-2 font-medium text-zinc-600">Metric</th>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 font-medium text-zinc-600">
                {h.split(" ")[0]}
              </th>
            ))}
            <th className="px-4 py-2 font-medium text-zinc-600">CAGR / Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800">{row.label}</td>
              {row.values.map((v, j) => (
                <td key={j} className="px-4 py-2 text-zinc-600">
                  {v !== null && v !== undefined ? (
                    <FormattedText text={String(v)} />
                  ) : (
                    "-"
                  )}
                </td>
              ))}
              <td className="px-4 py-2 font-semibold text-zinc-700">
                {row.trend !== null && row.trend !== undefined ? (
                  <FormattedText text={String(row.trend)} />
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

export function FundamentalReportView({
  title,
  ticker,
  status,
  reportData,
  fundamentalData,
  chartData,
  accent,
  filenameBase,
  isPending,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // fundamental_report JSON object
  fundamentalData: any; // fundamental_data JSON object
  chartData?: FinancialsHistory;
  accent?: string;
  filenameBase: string;
  isPending?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract analysis
  const analysis = reportData?.analysis || reportData || {};
  // const summary = reportData?.summary || {};

  // Extract tables from fundamentalData
  const inc = fundamentalData?.income_stmt?.income_statement || {};
  const bal = fundamentalData?.balance_sheet?.balance_sheet || {};
  const cf = fundamentalData?.cash_flow?.cash_flow || {};
  const fund = fundamentalData?.fundamentals?.fundamentals || {};
  const eps = fundamentalData?.eps_trend?.eps_trend || {};
  const val = fundamentalData?.valuation?.valuation || {};
  const gro = fundamentalData?.growth?.growth || {};

  // Helper to get sorted unique dates across multiple dicts
  const getDates = (...dicts: any[]) => {
    const dates = new Set<string>();
    for (const dict of dicts) {
      if (dict) {
        Object.keys(dict).forEach((k) => dates.add(k));
      }
    }
    return Array.from(dates).sort();
  };

  const revenueDates = getDates(inc.revenue, inc.net_income);
  const profitDates = getDates(inc.ebitda, fund.net_margin_pct, inc.eps_diluted);
  const capDates = getDates(bal.total_debt, fund.debt_to_equity, fund.interest_coverage);
  const cfDates = getDates(cf.operating_cash_flow, cf.free_cash_flow, bal.cash);
  const returnDates = getDates(fund.roe_pct, fund.roce_pct);

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
        
        {/* REVENUE & GROWTH */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. REVENUE & GROWTH</h3>
          <FundamentalGrowthChart data={chartData} />
          <MetricTable 
            headers={revenueDates}
            rows={[
              { label: "Revenue", values: revenueDates.map(d => inc.revenue?.[d]), trend: gro.revenue_cagr_pct ? `${gro.revenue_cagr_pct}%` : null },
              { label: "Net Income", values: revenueDates.map(d => inc.net_income?.[d]), trend: gro.net_income_cagr_pct ? `${gro.net_income_cagr_pct}%` : null }
            ]}
          />
          <AnalysisTextSection
            content={analysis.revenue_and_growth}
            isPending={isPending}
          />
        </section>

        {/* PROFITABILITY */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. PROFITABILITY</h3>
          <FundamentalProfitabilityChart data={chartData} />
          <MetricTable 
            headers={profitDates}
            rows={[
              { label: "EBITDA", values: profitDates.map(d => inc.ebitda?.[d]) },
              { label: "Net Margin (%)", values: profitDates.map(d => fund.net_margin_pct?.[d]) },
              { label: "Diluted EPS", values: profitDates.map(d => inc.eps_diluted?.[d]), trend: eps.eps_cagr_pct ? `${eps.eps_cagr_pct}%` : null }
            ]}
          />
          <AnalysisTextSection
            content={analysis.profitability}
            isPending={isPending}
          />
        </section>

        {/* CAPITAL STRUCTURE & SOLVENCY */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. CAPITAL STRUCTURE & SOLVENCY</h3>
          <MetricTable 
            headers={capDates}
            rows={[
              { label: "Total Debt", values: capDates.map(d => bal.total_debt?.[d]) },
              { label: "Debt-to-Equity", values: capDates.map(d => fund.debt_to_equity?.[d]) },
              { label: "Interest Coverage", values: capDates.map(d => fund.interest_coverage?.[d]) }
            ]}
          />
          <AnalysisTextSection
            content={analysis.capital_structure_and_solvency}
            isPending={isPending}
          />
        </section>

        {/* CASH FLOW & LIQUIDITY */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. CASH FLOW & LIQUIDITY</h3>
          <MetricTable 
            headers={cfDates}
            rows={[
              { label: "Operating Cash Flow", values: cfDates.map(d => cf.operating_cash_flow?.[d]) },
              { label: "Free Cash Flow", values: cfDates.map(d => cf.free_cash_flow?.[d]) },
              { label: "Cash Balance", values: cfDates.map(d => bal.cash?.[d]) }
            ]}
          />
          <AnalysisTextSection
            content={analysis.cash_flow_and_liquidity}
            isPending={isPending}
          />
        </section>

        {/* RETURN RATIOS */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. RETURN RATIOS</h3>
          <MetricTable 
            headers={returnDates}
            rows={[
              { label: "ROE (%)", values: returnDates.map(d => fund.roe_pct?.[d]) },
              { label: "ROCE (%)", values: returnDates.map(d => fund.roce_pct?.[d]) }
            ]}
          />
          <AnalysisTextSection
            content={analysis.return_ratios}
            isPending={isPending}
          />
        </section>

        {/* VALUATION & OWNERSHIP */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">6. VALUATION & OWNERSHIP</h3>
          <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/50 border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-zinc-600">Metric</th>
                  <th className="px-4 py-2 font-medium text-zinc-600">Current Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">Market Cap</td>
                  <td className="px-4 py-2 text-zinc-600">{val.market_cap != null ? <FormattedText text={String(val.market_cap)} /> : '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">P/E Ratio</td>
                  <td className="px-4 py-2 text-zinc-600">{val.valuation_ratios?.pe_ratio != null ? <FormattedText text={String(val.valuation_ratios.pe_ratio)} /> : '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">EV/EBITDA</td>
                  <td className="px-4 py-2 text-zinc-600">{val.valuation_ratios?.ev_ebitda != null ? <FormattedText text={String(val.valuation_ratios.ev_ebitda)} /> : '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">PEG Ratio</td>
                  <td className="px-4 py-2 text-zinc-600">{val.valuation_ratios?.peg_ratio != null ? <FormattedText text={String(val.valuation_ratios.peg_ratio)} /> : '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">Dividend Yield (%)</td>
                  <td className="px-4 py-2 text-zinc-600">{val.dividend_yield_pct != null ? <FormattedText text={String(val.dividend_yield_pct)} /> : '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">Promoter Holding (%)</td>
                  <td className="px-4 py-2 text-zinc-600">{val.promoter_holding_pct != null ? <FormattedText text={String(val.promoter_holding_pct)} /> : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <AnalysisTextSection
            content={analysis.valuation_and_ownership}
            isPending={isPending}
          />
        </section>

        </div>
      </div>

      {children}
    </div>
  );
}
