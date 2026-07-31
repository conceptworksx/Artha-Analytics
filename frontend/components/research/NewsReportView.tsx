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
        <div className="relative z-10 space-y-6">
        
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
      </div>
      {children}
    </div>
  );
}
