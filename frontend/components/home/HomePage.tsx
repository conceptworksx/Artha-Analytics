"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Brain,
  Zap,
  Search,
  Bot,
  FileText,
  ArrowRight,
  BarChart3,
  Shield,
  LineChart,
  User,
} from "lucide-react";
import { MdErrorOutline } from "react-icons/md";
import { getAuthUser, clearAuthSession, getSavedOpenRouterApiKey, type AuthUser } from "@/lib/api";
import { AuthCard } from "@/components/auth/AuthCard";
import { ProfileDialog } from "@/components/auth/ProfileDialog";

let hasHydrated = false;

export function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined" && hasHydrated) {
      return getAuthUser();
    }
    return null;
  });
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => {
    if (typeof window !== "undefined" && hasHydrated) {
      return !!getSavedOpenRouterApiKey()?.trim();
    }
    return false;
  });

  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });
  const howInView = useInView(howItWorksRef, { once: true, margin: "-80px" });

  useEffect(() => {
    hasHydrated = true;
    setMounted(true);

    const authedUser = getAuthUser();
    setUser(authedUser);
    if (authedUser) {
      setHasApiKey(!!getSavedOpenRouterApiKey()?.trim());
    }
  }, []);

  const handleTrySearch = () => {
    router.push("/search");
  };

  const handleAuth = () => {
    if (user) {
      router.push("/search");
    } else {
      setShowAuth(true);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
  };

  useEffect(() => {
    if (user) {
      setHasApiKey(!!getSavedOpenRouterApiKey()?.trim());
    } else {
      setHasApiKey(false);
    }
  }, [user]);



  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black">
      {/* Animated background aurora */}
      <div className="pointer-events-none fixed inset-0 -z-10">
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
      </div>

      {/* Floating particles */}
      {mounted &&
        Array.from({ length: 20 }).map((_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute h-1 w-1 rounded-full bg-[#d4a84c]/40"
            style={{ left: `${(i * 53 + 7) % 100}%`, top: `${(i * 37 + 13) % 100}%` }}
            animate={{ y: [0, -40, 0], opacity: [0.1, 0.7, 0.1] }}
            transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          />
        ))}

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 flex h-14 sm:h-16 items-center justify-between border-b border-black/5 bg-white/70 px-3 sm:px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link href="/">
            <img src="/navbar.png" alt="Artha Analytics" className="h-10 sm:h-14 object-contain cursor-pointer" />
          </Link>
        </div>
        {user ? (
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-[12px] text-neutral-700">
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
              <span className="truncate max-w-[80px] sm:max-w-[150px]">{user.name || user.email.split("@")[0]}</span>
              {!hasApiKey && <span className="text-[11px] font-bold text-red-500">!</span>}
            </button>
            <span className="h-4 w-px bg-black/10 hidden sm:block" />
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:block text-black hover:text-[#d4a84c] transition-colors font-semibold tracking-wider cursor-pointer"
            >
              LOGOUT
            </button>
          </div>
        ) : (
          <button
            id="nav-auth-btn"
            onClick={handleAuth}
            className="rounded-full bg-black px-5 py-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-white transition-all hover:bg-neutral-800 hover:shadow-lg cursor-pointer"
          >
            LOGIN / SIGN UP
          </button>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative flex min-h-[70vh] sm:min-h-[85vh] flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20 text-center">
        {/* Candlestick decoration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="candle-wrapper">
            <div className="candle-chart">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="candle" />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-3xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Artha{" "}
          <span className="bg-gradient-to-r from-[#d4a84c] via-[#f0c97a] to-[#d4a84c] bg-clip-text text-transparent">
            Analytics
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-4 max-w-xl font-mono text-[11px] sm:text-[13px] leading-relaxed tracking-wider text-neutral-700 px-2 sm:px-0"
        >
          AI-POWERED MULTI-AGENT EQUITY RESEARCH FOR INDIAN MARKETS.
          <br />
          5 SPECIALIZED AI AGENTS ANALYZE EVERY STOCK IN UNDER 60 SECONDS.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
        >
          {user ? (
            <button
              id="hero-go-search-btn"
              onClick={() => router.push("/search")}
              className="group relative overflow-hidden rounded-full bg-black px-5 sm:px-8 py-3 sm:py-3.5 font-mono text-[11px] sm:text-[12px] font-semibold tracking-[0.15em] sm:tracking-[0.25em] text-white shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Search size={15} />
                GO TO SEARCH DASHBOARD
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#d4a84c] via-[#f0c97a] to-[#d4a84c]"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.4 }}
              />
            </button>
          ) : (
            <>
              <button
                id="hero-try-search-btn"
                onClick={handleTrySearch}
                className="group relative overflow-hidden rounded-full bg-black px-5 sm:px-8 py-3 sm:py-3.5 font-mono text-[11px] sm:text-[12px] font-semibold tracking-[0.15em] sm:tracking-[0.25em] text-white shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Search size={15} />
                  TRY FREE SEARCH
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#d4a84c] via-[#f0c97a] to-[#d4a84c]"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </button>

              <button
                id="hero-auth-btn"
                onClick={handleAuth}
                className="rounded-full border border-black/20 bg-white text-black px-5 sm:px-8 py-3 sm:py-3.5 font-mono text-[11px] sm:text-[12px] font-semibold tracking-[0.15em] sm:tracking-[0.25em] transition-all hover:border-black hover:bg-neutral-50 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  LOGIN / SIGN UP
                  <ArrowRight size={14} />
                </span>
              </button>
            </>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 hidden sm:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] tracking-[0.3em] text-neutral-600">SCROLL</span>
            <div className="h-6 w-px bg-gradient-to-b from-neutral-400 to-transparent" />
          </div>
        </motion.div>
      </section>

      {/* ─── Features Section ─── */}
      <section ref={featuresRef} className="relative px-4 sm:px-6 py-12 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="font-mono text-[10px] tracking-[0.4em] text-[#d4a84c]">WHAT WE OFFER</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Intelligence, Not Guesswork
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Brain size={24} />,
                title: "Multi-Agent AI",
                desc: "5 specialized AI agents — Technical, Fundamental, News, Market & Sector — debate and analyze every stock from multiple angles.",
              },
              {
                icon: <BarChart3 size={24} />,
                title: "Deep Market Intelligence",
                desc: "Comprehensive analysis covering price action, financial health, industry trends, breaking news, and macro indicators.",
              },
              {
                icon: <Zap size={24} />,
                title: "60-Second Reports",
                desc: "Get institutional-grade equity research reports generated in under a minute. Complete with charts and actionable insights.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.15 * i }}
                className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white/60 p-5 sm:p-8 backdrop-blur-md transition-all hover:border-[#d4a84c]/30 hover:shadow-xl"
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#d4a84c]/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white transition-colors group-hover:bg-[#d4a84c]">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-800">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section ref={howItWorksRef} className="relative border-t border-black/5 bg-neutral-50/50 px-4 sm:px-6 py-12 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={howInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="font-mono text-[10px] tracking-[0.4em] text-[#d4a84c]">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Three Steps to Clarity
            </h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: <Search size={28} />, step: "01", title: "Search", desc: "Enter any NSE-listed stock ticker" },
              { icon: <Bot size={28} />, step: "02", title: "Analyze", desc: "5 AI agents process the stock in parallel" },
              { icon: <FileText size={28} />, step: "03", title: "Report", desc: "Get a comprehensive research report" },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                animate={howInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 * i }}
                className="relative text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm">
                  {s.icon}
                </div>
                <p className="font-mono text-[10px] tracking-[0.3em] text-[#d4a84c]">STEP {s.step}</p>
                <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-neutral-700">{s.desc}</p>
                {i < 2 && (
                  <div className="absolute right-0 top-8 hidden h-px w-8 translate-x-full bg-black/10 sm:block" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={howInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16 text-center"
          >
            {user ? (
              <button
                id="bottom-go-search-btn"
                onClick={() => router.push("/search")}
                className="group rounded-full bg-black px-8 py-3.5 font-mono text-[12px] font-semibold tracking-[0.25em] text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  GO TO SEARCH DASHBOARD
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ) : (
              <button
                id="bottom-try-search-btn"
                onClick={handleTrySearch}
                className="group rounded-full bg-black px-8 py-3.5 font-mono text-[12px] font-semibold tracking-[0.25em] text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  START FREE ANALYSIS
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="w-full border-t border-black/10 bg-neutral-50 py-10 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-widest text-neutral-700">ARTHA ANALYTICS</span>
            <span className="h-3 w-px bg-neutral-300" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-neutral-600">NSE EQUITY INDIA</span>
          </div>
          <span className="font-mono text-[10px] tracking-wider text-neutral-500">BUILT WITH AI FOR NEXT-GEN RESEARCH</span>
          <div className="h-px w-32 bg-black/5" />
          <a
            href="https://github.com/conceptworksx/Agentic-Trade-v2"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider text-neutral-600 transition-colors hover:text-blue-700"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="transition-transform group-hover:scale-110">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            CONTRIBUTE ON GITHUB
          </a>
        </div>
      </footer>

      {showAuth && (
        <AuthCard
          onAuthed={(authedUser) => {
            setUser(authedUser);
            setShowAuth(false);
            router.push("/search");
          }}
          onClose={() => setShowAuth(false)}
        />
      )}

      {user && (
        <ProfileDialog
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          user={user}
        />
      )}
    </div>
  );
}