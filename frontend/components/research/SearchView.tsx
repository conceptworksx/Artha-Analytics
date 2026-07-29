"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, ArrowRight } from "lucide-react";
import { MdErrorOutline } from "react-icons/md";
import { clearCached, getSavedOpenRouterApiKey, type AuthUser } from "@/lib/api";
import { LoadingView } from "./LoadingView";
import { ProfileDialog } from "@/components/auth/ProfileDialog";
import { BYOKModal } from "./BYOKModal";
import { Footer } from "@/components/layout/Footer";

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
      return !!getSavedOpenRouterApiKey()?.trim();
    }
    return true;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    <div className="relative min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-amber-100 font-sans flex flex-col">
      
      {/* Mesh Gradient Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden flex justify-center">
        {/* Amber Orb */}
        <motion.div
          className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-[100%] bg-amber-400/15 blur-[120px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Peach/Rose Orb */}
        <motion.div
          className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] rounded-[100%] bg-rose-400/10 blur-[120px]"
          animate={{ x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Soft Violet Orb */}
        <motion.div
          className="absolute -bottom-[20%] left-[20%] w-[700px] h-[500px] rounded-[100%] bg-violet-400/10 blur-[120px]"
          animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-black/[0.04] bg-gradient-to-r from-white/60 via-amber-50/30 to-white/60 px-4 sm:px-8 backdrop-blur-2xl transition-all">
        <div className="flex items-center gap-2">
          <Link href="/">
            <img src="/navbar.png" alt="Artha Analytics" className="h-12 object-contain cursor-pointer transition-transform hover:scale-[1.02]" />
          </Link>
        </div>
        {user && onLogout ? (
          <div className="flex items-center gap-3 font-mono text-[13px] text-zinc-600">
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-semibold tracking-wide cursor-pointer shadow-sm ${
                hasApiKey
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
            <button
              type="button"
              onClick={onLogout}
              className="text-zinc-400 hover:text-zinc-800 transition-colors font-semibold tracking-wider cursor-pointer text-[10px] sm:text-[12px] ml-1 sm:ml-0"
            >
              LOGOUT
            </button>
          </div>
        ) : (
          <button
            id="nav-auth-btn"
            onClick={onLoginClick}
            className="rounded-full bg-zinc-900 px-6 py-2.5 font-mono text-[12px] font-semibold tracking-wider text-white transition-all hover:bg-black hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
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
              className="block h-14 w-full border border-black/[0.06] bg-zinc-50/50 px-6 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-[3px] focus:ring-amber-500/20 rounded-[1rem] shadow-inner transition-all"
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
                    className={`flex h-12 w-full items-center justify-between px-6 text-left transition-colors duration-100 ${
                      i === highlight ? "bg-black/[0.03]" : "bg-transparent"
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
            <button
              onClick={() => handleAnalyse()}
              className="group mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 text-[15px] font-semibold tracking-wide text-white shadow-xl shadow-zinc-900/10 transition-all hover:scale-[1.02] hover:bg-black hover:shadow-2xl active:scale-95 cursor-pointer"
            >
              ANALYSE {selected.symbol}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          )}

          {error && (
            <p className="mt-4 text-center font-mono text-[12px] text-red-500 font-medium bg-red-50 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          {/* Popular Searches */}
          <div className="mt-10">
            <span className="block text-center text-[12px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Popular Searches
            </span>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {[
                { symbol: "RELIANCE", name: "Reliance Industries Limited" },
                { symbol: "TCS", name: "Tata Consultancy Services Limited" },
                { symbol: "WIPRO", name: "Wipro Limited" },
                { symbol: "HDFCBANK", name: "HDFC Bank Limited" },
                { symbol: "ADANIENT", name: "Adani Enterprises Limited" },
              ].map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => handleSelect(t)}
                  className="rounded-full border border-black/[0.04] bg-[#fafafa] px-4 py-2 text-[13px] font-medium text-zinc-600 shadow-sm transition-all hover:bg-white hover:text-zinc-900 hover:shadow-md cursor-pointer active:scale-95"
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
