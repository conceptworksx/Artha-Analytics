import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


export function ReportView({
  title,
  ticker,
  status,
  content,
  accent,
  filenameBase,
  children,
}: {
  title: string;
  ticker: string;
  status: string;
  content: string;
  accent?: string;
  filenameBase: string;
  children?: React.ReactNode;
}) {
  const canDownload = Boolean(content.trim());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div ref={containerRef} className="mx-auto max-w-[920px]">
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
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
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] px-3 py-1.5 font-sans text-[11px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
          >
            PDF
          </button>
        </div>
      </div>
      <div className="h-px w-full bg-[var(--border)]" />
      <p className="mt-2 font-mono text-[12px] text-[var(--muted-foreground)] mb-4">
        {ticker.split(".")[0]} · Report generated · {status}
      </p>

      <div className="mt-4 border border-[var(--border)] bg-white p-4 sm:p-5 rounded-xl shadow-sm mb-6 space-y-6">
        {content.trim() ? <Markdown content={content} /> : <ReportSkeleton />}
      </div>

      {content.trim() ? children : null}
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc max-w-none prose-headings:font-medium prose-h3:text-[16px] prose-p:text-[14.5px] prose-p:leading-relaxed prose-a:text-blue-600 prose-li:text-[14.5px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ ...props }) => (
            <div className="table-wrapper">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function DownloadBtn({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-zinc-900 bg-zinc-950 px-2.5 py-1 font-sans text-[11px] font-medium text-zinc-50 transition-all hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs cursor-pointer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5 opacity-90">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {children}
    </button>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200" />
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}

