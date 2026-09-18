"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log non-intrusively in production or dev
    console.warn("[App Error Boundary Caught]:", error?.message || error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-200">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
          An unexpected error occurred while rendering this page. You can reload the view or return to the search terminal.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RotateCcw size={15} />
            Try again
          </button>
          <Link
            href="/search"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Home size={15} />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}

