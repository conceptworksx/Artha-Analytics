"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { MdErrorOutline } from "react-icons/md";
import { clearCached, getSavedGroqApiKey, type AuthUser } from "@/lib/api";
import { LoadingView } from "./LoadingView";
import { ProfileDialog } from "@/components/auth/ProfileDialog";
import { BYOKModal } from "./BYOKModal";

let hasHydrated = false;

interface Ticker {
  symbol: string;
  name: string;
}

export function SearchView({
  user,
  onLogout,
  onLoginClick,
}: {
  user?: AuthUser;
  onLogout?: () => void;
  onLoginClick?: () => void;
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
  const [hasApiKey, setHasApiKey] = useState(() => {
    if (typeof window !== "undefined" && hasHydrated) {
      return !!getSavedGroqApiKey()?.trim();
    }
    return true;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickerToAnalyse, setTickerToAnalyse] = useState<Ticker | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hasHydrated = true;
    setHasApiKey(!!getSavedGroqApiKey()?.trim());
  }, []);

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
    return fuse
      .search(query)
      .slice(0, 8)
      .map((r) => r.item);
  }, [query, fuse]);

  const handleSelect = (t: Ticker) => {
    setSelected(t);
    setQuery(`${t.symbol} — ${t.name}`);
    setOpen(false);
  };

  const scrollToItem = (index: number) => {
    requestAnimationFrame(() => {
      listRef.current?.children[index]?.scrollIntoView({ block: "nearest" });
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && results.length > 0) {
        setOpen(true);
        setHighlight(0);
      } else if (results.length > 0) {
        setHighlight((h) => {
          const next = Math.min(h + 1, results.length - 1);
          scrollToItem(next);
          return next;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open && results.length > 0) {
        setHighlight((h) => {
          const next = Math.max(h - 1, 0);
          scrollToItem(next);
          return next;
        });
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && results.length > 0) {
        handleSelect(results[highlight]);
      } else if (selected) {
        handleAnalyse(selected);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleAnalyse = async (t?: Ticker) => {
    const target = t || selected;
    if (!target) return;

    const key = getSavedGroqApiKey();
    if (!key || !key.trim()) {
      setTickerToAnalyse(target);
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      clearCached(target.symbol);
      router.push(`/research/${target.symbol}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reach analysis service",
      );
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingView
        ticker={selected?.symbol ?? ""}
        user={user}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-black">
      {/* Animated background aurora & particles container */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-60 -left-60 h-[600px] w-[600px] rounded-full bg-[#d4a84c]/15 blur-[100px]"
          animate={{ x: [0, 120, 0], y: [0, 80, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-black/8 blur-[80px]"
          animate={{ x: [0, -80, 0], y: [0, -60, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#d4a84c]/8 blur-[120px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] [background-size:32px_32px]" />

        {/* Floating gold particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#d4a84c]/40"
            style={{
              left: `${(i * 53 + 7) % 100}%`,
              top: `${(i * 37 + 13) % 100}%`,
            }}
            animate={{ y: [0, -40, 0], opacity: [0.1, 0.7, 0.1] }}
            transition={{
              duration: 5 + (i % 4),
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Navbar matching report page style */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white/70 backdrop-blur-md px-5 w-full z-10">
        <div className="flex items-center">
          <Link href="/">
            <img
              src="/navbar.png"
              alt="Artha Analytics"
              className="h-14 object-contain cursor-pointer"
            />
          </Link>
        </div>

        {user && onLogout ? (
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
                <MdErrorOutline
                  size={14}
                  className="text-red-500 animate-pulse shrink-0"
                />
              )}
              <span className="truncate max-w-[150px]">
                {user.name || user.email.split("@")[0]}
              </span>
              {!hasApiKey && (
                <span className="text-[11px] font-bold text-red-500">!</span>
              )}
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
        ) : (
          <div className="flex items-center gap-4 font-mono text-[12px]">
            <button
              type="button"
              onClick={onLoginClick}
              className="text-xs font-semibold tracking-widest text-white bg-black hover:bg-neutral-800 px-4.5 py-2 rounded-full transition-all cursor-pointer shadow-sm"
            >
              LOGIN / SIGN UP
            </button>
          </div>
        )}
      </header>

      {/* Main search panel container */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative z-10 w-full max-w-4xl mx-auto">
        <div className="w-full max-w-[400px]">
          <label className="mb-2 ml-3 block font-mono text-[13px] tracking-wider text-[var(--label)]">
            SEARCH NSE TICKER
          </label>
          {/* Ticker Search Input wrapper */}
          <div className="relative w-full">
            <input
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
              placeholder="e.g. RELIANCE, TCS, WIPRO  ..."
              className="block h-12 w-full border-0 bg-white/50 backdrop-blur-md px-4 font-mono text-[14px] text-black placeholder:text-neutral-400 focus:outline-none focus:ring-0 rounded-lg shadow-md transition-all"
            />

            {open && results.length > 0 && (
              <div
                ref={listRef}
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 z-10 max-h-[300px] overflow-y-auto border border-black/5 bg-white/95 backdrop-blur-md rounded-lg shadow-lg"
              >
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
                    className={`flex h-10 w-full items-center justify-between px-4 text-left transition-colors duration-100 ${
                      i === highlight ? "bg-black/5" : "bg-transparent"
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
              onClick={() => handleAnalyse()}
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

          {/* Popular Searches */}
          <div className="mt-8">
            <span className="block text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-3">
              Popular Searches
            </span>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {[
                { symbol: "RELIANCE", name: "Reliance Industries Limited" },
                { symbol: "TCS", name: "Tata Consultancy Services Limited" },
                { symbol: "WIPRO", name: "Wipro Limited" },
                { symbol: "HDFCBANK", name: "HDFC Bank Limited" },
                { symbol: "TATAMOTORS", name: "Tata Motors Limited" },
              ].map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => handleSelect(t)}
                  className="font-mono text-[10px] bg-white/50 hover:bg-black hover:text-white border border-black/5 hover:border-black text-neutral-700 px-3 py-1.5 rounded-full shadow-sm transition-all duration-250 cursor-pointer active:scale-95"
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer pushed to the bottom of the page */}
      <footer className="w-full py-5 border-t border-[var(--border)] bg-zinc-50/20 flex flex-col items-center gap-1.5 font-mono tracking-wider text-[var(--label)] text-center mt-auto">
        <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          NSE EQUITY | INDIA
        </span>
        <span className="text-[10px] opacity-75">MADE BY CONCEPTWORKSX</span>
        <div className="h-px w-24 bg-[var(--border)] my-0.5" />
        <a
          href="https://github.com/conceptworksx/Agentic-Trade-v2"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[11px] tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>Contribute on GitHub</span>
        </a>
      </footer>

      {user && (
        <ProfileDialog
          user={user}
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setHasApiKey(!!getSavedGroqApiKey()?.trim());
          }}
        />
      )}
      <BYOKModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTickerToAnalyse(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setHasApiKey(true);
          if (tickerToAnalyse) {
            handleAnalyse(tickerToAnalyse);
          }
        }}
      />
    </div>
  );
}
