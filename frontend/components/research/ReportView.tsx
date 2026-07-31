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
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] px-3 py-1.5 font-sans text-[11px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
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
          {content.trim() ? <Markdown content={content} /> : <ReportSkeleton />}
        </div>
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

