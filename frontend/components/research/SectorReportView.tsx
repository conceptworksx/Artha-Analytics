import React, { useRef } from "react";
import { downloadPdf } from "@/lib/download";
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

  const handleDownloadPdf = async () => {
    downloadPdf(filenameBase, JSON.stringify(reportData, null, 2));
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
            className="flex items-center gap-1 rounded-md border border-[var(--cta)] bg-[var(--cta)] px-2.5 py-1 font-sans text-[11px] font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs cursor-pointer"
          >
            JSON
          </button>
        </div>
      </div>
      <div className="h-px w-full bg-[var(--border)]" />
      <p className="mt-2 font-mono text-[12px] text-[var(--muted-foreground)] mb-4">
        {ticker.split(".")[0]} · Report generated · {status}
      </p>

      <div className="mt-4 border border-[var(--border)] bg-white p-4 sm:p-5 rounded-xl shadow-sm mb-6 space-y-8">
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
      {children}
    </div>
  );
}
