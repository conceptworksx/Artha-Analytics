"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "lucide-react";
import { MdErrorOutline } from "react-icons/md";
import { Toaster } from "sonner";
import {
  clearCached,
  getSavedGroqApiKey,
  type AuthUser,
} from "@/lib/api";
import { LoadingScreen } from "./LoadingScreen";
import { ProfileModal } from "./ProfileModal";

interface Ticker {
  symbol: string;
  name: string;
}

export function TickerSearch({
  user,
  onLogout,
}: {
  user?: AuthUser;
  onLogout?: () => void;
}) {
  const router = useRouter();
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasApiKey(!!getSavedGroqApiKey()?.trim());
  }, []);

  // Load tickers on mount
  useEffect(() => {
    fetch("/nse-tickers.json")
      .then((r) => r.json())
      .then(setTickers)
      .catch(() => setTickers([]));
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(tickers, {
        keys: ["symbol", "name"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [tickers],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuse]);

  const handleSelect = (t: Ticker) => {
    setSelected(t);
    setQuery(`${t.symbol} — ${t.name}`);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && results.length > 0) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      if (results.length === 0) return;
      setHighlight((h) => {
        const next = Math.min(h + 1, results.length - 1);
        scrollToItem(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open || results.length === 0) return;
      setHighlight((h) => {
        const next = Math.max(h - 1, 0);
        scrollToItem(next);
        return next;
      });
    } else if (e.key === "Enter") {
      if (open && results.length > 0) {
        e.preventDefault();
        handleSelect(results[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const scrollToItem = (index: number) => {
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const item = list.children[index] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    });
  };

  const handleAnalyse = async () => {
    if (!selected) return;

    setLoading(true);
    setError(null);
    try {
      clearCached(selected.symbol);
      router.push(`/research/${selected.symbol}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reach analysis service",
      );
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        ticker={selected?.symbol ?? ""}
        user={user}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-black">
      {/* Animated gold aurora */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#d4a84c]/20 blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, 60, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-black/10 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Floating gold particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-[#d4a84c]/50"
          style={{ left: `${(i * 67) % 100}%`, top: `${(i * 41) % 100}%` }}
          animate={{ y: [0, -35, 0], opacity: [0.15, 0.8, 0.15] }}
          transition={{
            duration: 5 + (i % 6),
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Navbar matching report page style */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white/70 backdrop-blur-md px-5 w-full z-10">
        <div className="flex items-center">
          <img
            src="/navbar.png"
            alt="Artha Analytics"
            className="h-14 object-contain"
          />
        </div>

        {user && onLogout && (
          <div className="flex items-center gap-4 font-mono text-[12px] text-[var(--muted-foreground)]">
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all font-semibold tracking-wider cursor-pointer shadow-sm animate-none ${
                hasApiKey
                  ? "border-black/10 hover:border-[#d4a84c]/50 bg-neutral-50/50 hover:bg-neutral-50 text-neutral-700 hover:text-[#d4a84c]"
                  : "border-red-500 hover:border-red-600 bg-red-50/30 hover:bg-red-50 text-red-600 font-bold"
              }`}
            >
              {hasApiKey ? (
                <User size={13} className="text-[#d4a84c]" />
              ) : (
                <MdErrorOutline size={14} className="text-red-500 animate-pulse shrink-0" />
              )}
              <span className="truncate max-w-[150px]">
                {user.name || user.email.split("@")[0]}
              </span>
              {!hasApiKey && <span className="text-[11px] font-bold text-red-500">!</span>}
            </button>
            <span className="h-4 w-px bg-black/10 hidden sm:block" />
            <button
              type="button"
              onClick={onLogout}
              className="text-[var(--foreground)] hover:text-[#d4a84c] transition-colors font-semibold tracking-wider cursor-pointer"
            >
              LOGOUT
            </button>
          </div>
        )}
      </header>

      {/* Main search panel container */}
      <main className="flex flex-1 items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-[400px]">
          {!hasApiKey && (
            <div className="mb-4 rounded-lg border border-red-200/50 bg-red-50/40 p-3 text-center animate-pulse">
              <p className="font-mono text-[11px] font-bold text-red-600">
                ⚠️ Groq API Key is missing. Click your profile name above to add it.
              </p>
            </div>
          )}
          <label className="mb-2 ml-3 block font-mono text-[13px] tracking-wider text-[var(--label)]">
            SEARCH NSE TICKER
          </label>
          {/* Ticker Search Input wrapper */}
          <div className="relative w-full">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setSelected(null);
                setHighlight(0);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={handleKey}
              placeholder="e.g. RELIANCE, TCS, INFY  ..."
              className="block h-12 w-full border-0 bg-white/50 backdrop-blur-md px-4 font-mono text-[14px] text-black placeholder:text-neutral-400 focus:outline-none focus:ring-0 rounded-lg shadow-md transition-all"
            />

            {open && results.length > 0 && (
              <div ref={listRef} role="listbox" className="absolute left-0 right-0 top-full mt-2 z-10 max-h-[300px] overflow-y-auto border border-black/5 bg-white/95 backdrop-blur-md rounded-lg shadow-lg">
                {results.map((t, i) => (
                  <button
                    key={t.symbol}
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(t);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex h-10 w-full items-center justify-between px-4 text-left transition-colors duration-100 ${i === highlight ? "bg-black/5" : "bg-transparent"
                      }`}
                  >
                    <span className="font-mono text-[13px] font-bold text-black">
                      {t.symbol}
                    </span>
                    <span className="ml-4 truncate text-[12px] text-neutral-500">
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <button
              onClick={handleAnalyse}
              className="mt-3 block h-11 w-full bg-black text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 rounded-lg shadow-sm font-sans tracking-widest cursor-pointer"
            >
              ANALYSE {selected.symbol} →
            </button>
          )}

          {error && (
            <p className="mt-4 text-center font-mono text-[11px] text-[var(--sell)]">
              {error}
            </p>
          )}
        </div>
      </main>

      {/* Footer pushed to the bottom of the page */}
      <footer className="w-full py-5 border-t border-[var(--border)] bg-zinc-50/20 flex flex-col items-center gap-1.5 font-mono tracking-wider text-[var(--label)] text-center mt-auto">
        <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">NSE EQUITY | INDIA</span>
        <span className="text-[10px] opacity-75">MADE BY CONCEPTWORKSX</span>
        <div className="h-px w-24 bg-[var(--border)] my-0.5" />
        <a
          href="https://github.com/conceptworksx/Agentic-Trade-v2"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[11px] tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>Contribute on GitHub</span>
        </a>
      </footer>

      <Toaster richColors position="top-center" />
      {user && (
        <ProfileModal
          user={user}
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setHasApiKey(!!getSavedGroqApiKey()?.trim());
          }}
        />
      )}
    </div>
  );
}

