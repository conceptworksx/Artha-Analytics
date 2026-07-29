import React, { useRef } from "react";

import { FormattedText } from "@/components/ui/FormattedText";

export function NewsReportView({
  title,
  ticker,
  status,
  reportData,
  companyNews,
  indianNews,
  globalNews,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // news_report JSON object
  companyNews?: any; 
  indianNews?: any;
  globalNews?: any;
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

  const NewsTable = ({ articles }: { articles: any[] }) => {
    if (!articles || articles.length === 0) return <p className="text-sm text-zinc-500 italic my-2">No news available.</p>;
    return (
      <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/50">
            <tr>
              <th className="px-4 py-2 font-medium text-zinc-800">Date</th>
              <th className="px-4 py-2 font-medium text-zinc-800">Priority</th>
              <th className="px-4 py-2 font-medium text-zinc-800">Title</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {articles.map((a, i) => (
              <tr key={i} className="hover:bg-zinc-50/30 transition-colors">
                <td className="px-4 py-2 text-zinc-600">{a.published_at ? <FormattedText text={new Date(a.published_at).toLocaleDateString()} /> : '-'}</td>
                <td className="px-4 py-2 text-zinc-600">{a.priority ? <FormattedText text={String(a.priority)} /> : '-'}</td>
                <td className="px-4 py-2 text-zinc-800 max-w-[300px] truncate" title={a.title}><FormattedText text={a.title} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="mx-auto max-w-[920px]">
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
          {accent && <span className="inline-block h-2.5 w-2.5" style={{ background: accent }} />}
          {title}
        </h2>
        <div className="flex items-center gap-4">
          <button disabled={!canDownload} onClick={handleDownloadPdf} className="flex items-center gap-1 rounded-md border border-[var(--cta)] bg-[var(--cta)] px-2.5 py-1 font-sans text-[11px] font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs cursor-pointer">
            PDF
          </button>
        </div>
      </div>
      <div className="h-px w-full bg-[var(--border)]" />
      <p className="mt-2 font-mono text-[12px] text-[var(--muted-foreground)] mb-4">
        {ticker.split(".")[0]} · Report generated · {status}
      </p>

      <div className="mt-4 border border-[var(--border)] bg-white p-4 sm:p-5 rounded-xl shadow-sm mb-6 space-y-6">
        
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. COMPANY NEWS IMPACT</h3>
          <NewsTable articles={companyNews?.articles || []} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm space-y-2">
            <div><span className="font-semibold text-zinc-900">Short-Term Impact: </span><FormattedText text={analysis.company_short_term || "No analysis available."} /></div>
            <div><span className="font-semibold text-zinc-900">Long-Term Impact: </span><FormattedText text={analysis.company_long_term || "No analysis available."} /></div>
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. INDIAN MARKET IMPACT</h3>
          <NewsTable articles={indianNews?.articles || []} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.indian_impact || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. GLOBAL MACRO IMPACT</h3>
          <NewsTable articles={globalNews?.articles || []} />
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.macro_impact || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. CROSS-MARKET INTERACTION</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm">
            <span className="font-semibold text-zinc-900">Analysis: </span>
            <FormattedText text={analysis.cross_market || "No analysis available."} />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. KEY RISKS & OPPORTUNITIES</h3>
          <div className="p-4 bg-zinc-50/50 border border-zinc-200 rounded-lg text-[14px] text-zinc-700 leading-relaxed shadow-sm space-y-2">
            <div><span className="font-semibold text-zinc-900">Risks: </span><FormattedText text={analysis.risks || "No analysis available."} /></div>
            <div><span className="font-semibold text-zinc-900">Opportunities: </span><FormattedText text={analysis.opportunities || "No analysis available."} /></div>
          </div>
        </section>

      </div>
      {children}
    </div>
  );
}
