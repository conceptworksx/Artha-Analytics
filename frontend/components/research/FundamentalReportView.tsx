import React, { useRef } from "react";

import { FormattedText } from "@/components/ui/FormattedText";
import { 
  FundamentalGrowthChart,
  FundamentalProfitabilityChart,
  type FinancialsHistory
} from "@/components/charts/FundamentalChart";

export function FundamentalReportView({
  title,
  ticker,
  status,
  reportData,
  fundamentalData,
  chartData,
  accent,
  filenameBase,
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
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canDownload = Boolean(reportData);

  const handleDownloadPdf = () => {
    window.print();
  };

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
            Object.keys(dict).forEach(k => dates.add(k));
        }
    }
    return Array.from(dates).sort();
  };

  const revenueDates = getDates(inc.revenue, inc.net_income);
  const profitDates = getDates(inc.ebitda, fund.net_margin_pct, inc.eps_diluted);
  const capDates = getDates(bal.total_debt, fund.debt_to_equity, fund.interest_coverage);
  const cfDates = getDates(cf.operating_cash_flow, cf.free_cash_flow, bal.cash);
  const returnDates = getDates(fund.roe_pct, fund.roce_pct);

  // Reusable Table Component
  const MetricTable = ({ headers, rows }: { headers: string[], rows: { label: string, values: (string | number | null)[], trend?: string | number | null }[] }) => (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-zinc-50/50 border-b border-[var(--border)]">
          <tr>
            <th className="px-4 py-2 font-medium text-zinc-600">Metric</th>
            {headers.map(h => <th key={h} className="px-4 py-2 font-medium text-zinc-600">{h.split(' ')[0]}</th>)}
            <th className="px-4 py-2 font-medium text-zinc-600">CAGR / Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800">{row.label}</td>
              {row.values.map((v, j) => (
                <td key={j} className="px-4 py-2 text-zinc-600">{v !== null && v !== undefined ? <FormattedText text={String(v)} /> : '-'}</td>
              ))}
              <td className="px-4 py-2 font-semibold text-zinc-700">{row.trend !== null && row.trend !== undefined ? <FormattedText text={String(row.trend)} /> : '-'}</td>
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
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.revenue_and_growth || "No analysis available."} />
          </div>
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
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.profitability || "No analysis available."} />
          </div>
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
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.capital_structure_and_solvency || "No analysis available."} />
          </div>
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
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.cash_flow_and_liquidity || "No analysis available."} />
          </div>
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
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.return_ratios || "No analysis available."} />
          </div>
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
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.valuation_and_ownership || "No analysis available."} />
          </div>
        </section>

        </div>
      </div>

      {children}
    </div>
  );
}
