import React, { useRef } from "react";
import { Loader2 } from "lucide-react";

import { FormattedText } from "@/components/ui/FormattedText";
import { sanitizeTickerSymbol } from "@/lib/sanitizer";
import { humanizeFieldName } from "@/lib/humanizer";

const MetricTable = React.memo(function MetricTable({
  rows,
  columns,
}: {
  rows: any[];
  columns: string[];
}) {
  return (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-zinc-50 border-b border-[var(--border)]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 font-semibold text-zinc-700">
                {humanizeFieldName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr
              key={i}
              className="even:bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-2 text-zinc-600">
                  {row[col] !== null && row[col] !== undefined ? (
                    <FormattedText text={String(row[col])} />
                  ) : (
                    "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export function SectorReportView({
  title,
  ticker,
  status,
  reportData,
  accent,
  filenameBase,
  isPending,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // sector_report JSON object
  accent?: string;
  filenameBase: string;
  isPending?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderSectionContent = (content: any) => {
    if (!content) return null;

    // Handle key-value pairs (subheadings)
    if (typeof content === "object" && !Array.isArray(content)) {
      return (
        <div className="space-y-4">
          {Object.entries(content).map(([subKey, subVal]) => {
            if (subKey === "_content") {
              if (Array.isArray(subVal)) {
                const rows = subVal as any[];
                if (rows.length === 0) return null;
                const columns = Object.keys(rows[0]);
                return <MetricTable key={subKey} rows={rows} columns={columns} />;
              } else {
                return (
                  <div
                    key={subKey}
                    className="whitespace-pre-wrap text-[14px] text-zinc-700 leading-relaxed"
                  >
                    <FormattedText text={String(subVal)} />
                  </div>
                );
              }
            }
            
            if (Array.isArray(subVal)) {
                const rows = subVal as any[];
                if (rows.length === 0) return null;
                const columns = Object.keys(rows[0]);
                return (
                  <div key={subKey} className="text-[14px] text-zinc-700 leading-relaxed">
                    <span className="font-semibold text-zinc-900 block mb-1">{humanizeFieldName(subKey)}: </span>
                    <MetricTable rows={rows} columns={columns} />
                  </div>
                );
            }

            return (
              <div
                key={subKey}
                className="text-[14px] text-zinc-700 leading-relaxed"
              >
                <span className="font-semibold text-zinc-900 block mb-1">
                  {humanizeFieldName(subKey)}:{" "}
                </span>
                <div className="whitespace-pre-wrap"><FormattedText text={String(subVal)} /></div>
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback string
    return (
      <div className="whitespace-pre-wrap text-[14px] text-zinc-700 leading-relaxed">
        <FormattedText text={String(content)} />
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
          {(!reportData || Object.keys(reportData).length === 0) && isPending ? (
            <div className="space-y-4 animate-pulse p-5 rounded-xl border border-zinc-200/75 bg-gradient-to-r from-zinc-50/90 via-amber-500/[0.02] to-zinc-50/90">
              <div className="flex items-center gap-2 text-zinc-800 font-medium text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Sector specialist compiling industry benchmarks and macroeconomic data...</span>
              </div>
              <div className="h-3.5 w-1/3 bg-gradient-to-r from-zinc-200/70 via-zinc-100 to-zinc-200/70 rounded-md" />
              <div className="h-20 w-full bg-zinc-100/70 border border-zinc-200/50 rounded-xl" />
              <div className="h-3.5 w-1/4 bg-gradient-to-r from-zinc-200/70 via-zinc-100 to-zinc-200/70 rounded-md" />
              <div className="h-20 w-full bg-zinc-100/70 border border-zinc-200/50 rounded-xl" />
            </div>
          ) : (
            Object.entries(reportData || {}).map(
              ([sectionTitle, sectionContent], index) => (
                <section
                  key={sectionTitle}
                  className={index > 0 ? "pt-4 border-t border-zinc-100" : ""}
                >
                  <h3 className="text-md font-semibold text-zinc-800 mb-4 border-b pb-1">
                    {humanizeFieldName(sectionTitle)}
                  </h3>
                  {renderSectionContent(sectionContent)}
                </section>
              )
            )
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
