import React, { useRef } from "react";
import { downloadPdf } from "@/lib/download";

export function FundamentalReportView({
  title,
  ticker,
  status,
  reportData,
  fundamentalData,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // fundamental_report JSON object
  fundamentalData: any; // fundamental_data JSON object
  accent?: string;
  filenameBase: string;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canDownload = Boolean(reportData);

  const handleDownloadPdf = async () => {
    // Basic text dump for now since it's no longer just markdown string
    downloadPdf(filenameBase, JSON.stringify(reportData, null, 2));
  };

  // Extract analysis
  const analysis = reportData?.analysis || {};
  const summary = reportData?.summary || {};

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
            <tr key={i} className="hover:bg-zinc-50/30 transition-colors">
              <td className="px-4 py-2 font-medium text-zinc-800">{row.label}</td>
              {row.values.map((v, j) => (
                <td key={j} className="px-4 py-2 text-zinc-600">{v !== null && v !== undefined ? v : '-'}</td>
              ))}
              <td className="px-4 py-2 font-semibold text-zinc-700">{row.trend !== null && row.trend !== undefined ? row.trend : '-'}</td>
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
          {accent && (
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ background: accent }}
            />
          )}
          {title}
        </h2>
        <div className="flex items-center gap-4">
          <button
            disabled={!canDownload}
            onClick={handleDownloadPdf}
            className="flex items-center gap-1 rounded-md border border-zinc-900 bg-zinc-950 px-2.5 py-1 font-sans text-[11px] font-medium text-zinc-50 transition-all hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs cursor-pointer"
          >
            JSON
          </button>
        </div>
      </div>
      <div className="h-px w-full bg-[var(--border)]" />
      <p className="mt-2 font-mono text-[12px] text-[var(--muted-foreground)] mb-6">
        {ticker.split(".")[0]} · Report generated · {status}
      </p>

      <div className="mt-6 border border-[var(--border)] bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm mb-6 space-y-8">
        
        {/* REVENUE & GROWTH */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. REVENUE & GROWTH</h3>
          <MetricTable 
            headers={revenueDates}
            rows={[
              { label: "Revenue", values: revenueDates.map(d => inc.revenue?.[d]), trend: gro.revenue_cagr_pct ? `${gro.revenue_cagr_pct}%` : null },
              { label: "Net Income", values: revenueDates.map(d => inc.net_income?.[d]), trend: gro.net_income_cagr_pct ? `${gro.net_income_cagr_pct}%` : null }
            ]}
          />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.revenue_and_growth || "No analysis available."}
          </div>
        </section>

        {/* PROFITABILITY */}
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. PROFITABILITY</h3>
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
            {analysis.profitability || "No analysis available."}
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
            {analysis.capital_structure_and_solvency || "No analysis available."}
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
            {analysis.cash_flow_and_liquidity || "No analysis available."}
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
            {analysis.return_ratios || "No analysis available."}
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
                  <td className="px-4 py-2 text-zinc-600">{val.market_cap ?? '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">P/E Ratio</td>
                  <td className="px-4 py-2 text-zinc-600">{val.valuation_ratios?.pe_ratio ?? '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">EV/EBITDA</td>
                  <td className="px-4 py-2 text-zinc-600">{val.valuation_ratios?.ev_ebitda ?? '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">PEG Ratio</td>
                  <td className="px-4 py-2 text-zinc-600">{val.valuation_ratios?.peg_ratio ?? '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">Dividend Yield (%)</td>
                  <td className="px-4 py-2 text-zinc-600">{val.dividend_yield_pct ?? '-'}</td>
                </tr>
                <tr className="hover:bg-zinc-50/30 transition-colors">
                  <td className="px-4 py-2 font-medium text-zinc-800">Promoter Holding (%)</td>
                  <td className="px-4 py-2 text-zinc-600">{val.promoter_holding_pct ?? '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            {analysis.valuation_and_ownership || "No analysis available."}
          </div>
        </section>

      </div>

      {children}
    </div>
  );
}
