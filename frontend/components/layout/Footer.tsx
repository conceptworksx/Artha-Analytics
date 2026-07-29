export function Footer() {
  return (
    <footer className="w-full border-t border-black/[0.04] bg-gradient-to-b from-white to-rose-50/20 py-4 text-center mt-auto">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-zinc-900">Artha Analytics</span>
          <span className="h-4 w-px bg-black/10" />
          <span className="text-[14px] text-zinc-500">NSE Equity India</span>
        </div>
        <p className="text-[13px] text-zinc-400">Designed with absolute precision.</p>
        <a
          href="https://github.com/conceptworksx/Agentic-Trade-v2"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-zinc-50 px-4 py-2 text-[13px] font-medium text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="transition-transform group-hover:scale-110">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
