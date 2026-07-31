import React, { useRef } from "react";

import { FormattedText } from "@/components/ui/FormattedText";

export function SectorReportView({
  title,
  ticker,
  status,
  reportData,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  reportData: any; // sector_report JSON object
  accent?: string;
  filenameBase: string;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canDownload = Boolean(reportData);

  const handleDownloadPdf = () => {
    window.print();
  };

  const MetricTable = ({ rows, columns }: { rows: any[]; columns: string[] }) => (
    <div className="overflow-x-auto my-4 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-zinc-50 border-b border-[var(--border)]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 font-semibold text-zinc-700">
                {col}
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
                  {row[col] !== null && row[col] !== undefined
                    ? <FormattedText text={String(row[col])} />
                    : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
                    <span className="font-semibold text-zinc-900 block mb-1">{subKey}: </span>
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
                  {subKey}:{" "}
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
      <div className="text-[14px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
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
          {Object.entries(reportData || {}).map(
            ([sectionTitle, sectionContent], index) => (
              <section
                key={sectionTitle}
                className={index > 0 ? "pt-4 border-t border-zinc-100" : ""}
              >
                <h3 className="text-md font-semibold text-zinc-800 mb-4 border-b pb-1">
                  {sectionTitle}
                </h3>
                {renderSectionContent(sectionContent)}
              </section>
            )
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
