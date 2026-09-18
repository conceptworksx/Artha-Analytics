import React, { useRef } from "react";
import { Loader2 } from "lucide-react";

import { FormattedText } from "@/components/ui/FormattedText";
import { sanitizeTickerSymbol } from "@/lib/sanitizer";

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
          <span>Specialist compiling qualitative sentiment & news insights...</span>
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

const NewsTable = React.memo(function NewsTable({
  articles,
}: {
  articles: any[];
}) {
  if (!articles || articles.length === 0) {
    return <p className="text-sm text-zinc-500 italic my-2">No news available.</p>;
  }
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
              <td className="px-4 py-2 text-zinc-600">
                {a.published_at ? (
                  <FormattedText text={new Date(a.published_at).toLocaleDateString()} />
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-2 text-zinc-600">
                {a.priority ? <FormattedText text={String(a.priority)} /> : "-"}
              </td>
              <td className="px-4 py-2 text-zinc-800 max-w-[300px] truncate" title={a.title}>
                <FormattedText text={a.title} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

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
  isPending,
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
  isPending?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const analysis = reportData?.analysis || reportData || {};

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
        <div className="relative z-10 space-y-6">
        
        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">1. COMPANY NEWS IMPACT</h3>
          <NewsTable articles={companyNews?.articles || []} />
          <div className="space-y-2">
            <AnalysisTextSection
              content={analysis.company_short_term ? `**Short-Term Impact:** ${analysis.company_short_term}\n\n**Long-Term Impact:** ${analysis.company_long_term || "N/A"}` : null}
              isPending={isPending}
            />
          </div>
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">2. INDIAN MARKET IMPACT</h3>
          <NewsTable articles={indianNews?.articles || []} />
          <AnalysisTextSection
            content={analysis.indian_impact}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">3. GLOBAL MACRO IMPACT</h3>
          <NewsTable articles={globalNews?.articles || []} />
          <AnalysisTextSection
            content={analysis.macro_impact}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">4. CROSS-MARKET INTERACTION</h3>
          <AnalysisTextSection
            content={analysis.cross_market}
            isPending={isPending}
          />
        </section>

        <section>
          <h3 className="text-md font-semibold text-zinc-800 mb-2 border-b pb-1">5. KEY RISKS & OPPORTUNITIES</h3>
          <AnalysisTextSection
            content={analysis.risks || analysis.opportunities ? `**Risks:** ${analysis.risks || "N/A"}\n\n**Opportunities:** ${analysis.opportunities || "N/A"}` : null}
            isPending={isPending}
          />
        </section>

        </div>
      </div>
      {children}
    </div>
  );
}
