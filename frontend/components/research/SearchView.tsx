"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, ArrowRight, Search, History } from "lucide-react";
import { MdErrorOutline } from "react-icons/md";
import { clearCached, getSavedOpenRouterApiKey, type AuthUser } from "@/lib/api";
import { LoadingView } from "./LoadingView";
import { ProfileDialog } from "@/components/auth/ProfileDialog";
import { BYOKModal } from "./BYOKModal";
import { Footer } from "@/components/layout/Footer";
import { HistoryModal } from "./HistoryModal";

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
  const [includeDebate, setIncludeDebate] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<"low" | "medium" | "high">("low");
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => {
    if (typeof window !== "undefined" && hasHydrated) {
      return !!getSavedOpenRouterApiKey()?.trim();
    }
    return true;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [tickerToAnalyse, setTickerToAnalyse] = useState<Ticker | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hasHydrated = true;
    setHasApiKey(!!getSavedOpenRouterApiKey()?.trim());
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

    const key = getSavedOpenRouterApiKey();
    if (!key || !key.trim()) {
      setTickerToAnalyse(target);
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      clearCached(target.symbol);
      router.push(`/research/${target.symbol}?debate=${includeDebate}&mode=${thinkingMode}`);
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
    <div className="relative min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-amber-100 font-sans flex flex-col">

      {/* Clean Background Grid */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-black/[0.04] bg-white px-4 sm:px-8 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <Link href="/">
            <img src="/navbar.png" alt="Artha Analytics" className="h-12 object-contain cursor-pointer transition-transform hover:scale-[1.02]" />
          </Link>
        </div>
        {user && onLogout ? (
          <div className="flex items-center gap-3 font-mono text-[13px] text-zinc-600">
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="hidden sm:flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
              title="View Past Analysis"
            >
              <History size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-semibold tracking-wide cursor-pointer shadow-sm ${hasApiKey
                  ? "border-black/5 hover:border-black/10 bg-white hover:bg-zinc-50 text-zinc-800 hover:shadow-md"
                  : "border-red-200 hover:border-red-300 bg-red-50 text-red-600"
                }`}
            >
              {hasApiKey ? (
                <User size={14} className="text-zinc-400" />
              ) : (
                <MdErrorOutline size={15} className="text-red-500 animate-pulse shrink-0" />
              )}
              <span className="truncate max-w-[100px] sm:max-w-[200px]">{user.name || user.email.split("@")[0]}</span>
              {!hasApiKey && <span className="text-[11px] font-bold text-red-500">!</span>}
            </button>
          </div>
        ) : (
          <button
            id="nav-auth-btn"
            onClick={onLoginClick}
            className="rounded-full bg-zinc-900 px-4 py-2 sm:px-6 sm:py-2.5 font-mono text-[10px] sm:text-[12px] font-semibold tracking-wider text-white transition-all hover:bg-black hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          >
            LOGIN / SIGN UP
          </button>
        )}
      </header>

      {/* Main search panel container */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-12 relative z-10 w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md rounded-[2rem] border border-black/[0.04] bg-white/70 p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Initialize Research</h2>
            <p className="text-[15px] text-zinc-500">Enter any NSE-listed stock ticker to deploy the agents.</p>
          </div>

          {/* Ticker Search Input wrapper */}
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
              <Search size={18} className="text-slate-400" />
            </div>
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
              placeholder="e.g. RELIANCE, TCS, WIPRO..."
              className="block h-12 sm:h-14 w-full border border-slate-200 bg-slate-50 pl-12 pr-6 text-[14px] sm:text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 rounded-[1rem] shadow-sm transition-all"
            />

            {open && results.length > 0 && (
              <div
                ref={listRef}
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[300px] overflow-y-auto border border-black/[0.04] bg-white/95 backdrop-blur-xl rounded-[1rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-2"
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
                    className={`flex h-12 w-full items-center justify-between px-6 text-left transition-colors duration-100 ${i === highlight ? "bg-black/[0.03]" : "bg-transparent"
                      }`}
                  >
                    <span className="font-mono text-[14px] font-bold text-zinc-900">
                      {t.symbol}
                    </span>
                    <span className="ml-4 truncate text-[13px] text-zinc-500">
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="mt-6 flex flex-col gap-4">
              {user && (
                <>
                  <div className="flex flex-row items-center justify-between py-4 px-4 rounded-xl border border-amber-200/50 bg-amber-50/30 mb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-amber-900">
                        Include Investment Debate
                      </span>
                      <span className="text-[12px] text-amber-700/70">
                        Run bull vs. bear agent simulation
                      </span>
                    </div>
                    <button
                      onClick={() => setIncludeDebate(!includeDebate)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${includeDebate ? "bg-amber-500" : "bg-amber-200"}`}
                      role="switch"
                      aria-checked={includeDebate}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${includeDebate ? "translate-x-2" : "-translate-x-2"}`}
                      />
                    </button>
                  </div>
                  
                  {/* Thinking Level Segmented Control */}
                  <div className="flex flex-col gap-3 py-3 px-4 rounded-xl border border-amber-200/30 bg-amber-50/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-amber-900">Agent Intelligence Level</span>
                    </div>
                    <div className="flex w-full rounded-lg bg-amber-100/50 p-1">
                      {(["low", "medium", "high"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setThinkingMode(mode)}
                          className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold capitalize transition-all ${
                            thinkingMode === mode
                              ? "bg-white text-amber-900 shadow-sm font-bold ring-1 ring-amber-200"
                              : "text-amber-700/60 hover:text-amber-800"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => handleAnalyse()}
                className="group flex h-12 sm:h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-slate-900 text-[14px] sm:text-[15px] font-semibold tracking-wide text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95 cursor-pointer mt-2"
              >
                ANALYSE {selected.symbol}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 text-slate-300" />
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-center font-mono text-[12px] text-red-500 font-medium bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          {/* Popular Searches */}
          <div className="mt-10">
            <span className="block text-center text-[12px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Popular Searches
            </span>
            <div className="flex flex-row flex-wrap gap-2 justify-center">
              {[
                { symbol: "RELIANCE", name: "Reliance Industries Limited" },
                { symbol: "TCS", name: "Tata Consultancy Services Limited" },
                { symbol: "ADANIENT", name: "Adani Enterprises Limited" },
                { symbol: "WIPRO", name: "Wipro Limited" },
                { symbol: "HDFCBANK", name: "HDFC Bank Limited" },
              ].map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => handleSelect(t)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm transition-all hover:bg-white hover:text-slate-900 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95"
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* ─── Footer ─── */}
      <Footer />

      {user && (
        <ProfileDialog
          user={user}
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setHasApiKey(!!getSavedOpenRouterApiKey()?.trim());
          }}
          onLogout={onLogout}
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
      {user && (
        <HistoryModal 
          isOpen={showHistoryModal} 
          onClose={() => setShowHistoryModal(false)} 
          user={user} 
        />
      )}
    </div>
  );
}
