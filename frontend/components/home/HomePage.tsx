"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  Zap,
  Search,
  Bot,
  FileText,
  ArrowRight,
  User,
  Activity,
  Layers
} from "lucide-react";
import { MdErrorOutline } from "react-icons/md";
import { getAuthUser, clearAuthSession, getSavedOpenRouterApiKey, type AuthUser } from "@/lib/api";
import { AuthCard } from "@/components/auth/AuthCard";
import { ProfileDialog } from "@/components/auth/ProfileDialog";
import { Footer } from "@/components/layout/Footer";
import { HistoryModal } from "@/components/research/HistoryModal";

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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => {
    if (typeof window !== "undefined" && hasHydrated) {
      return !!getSavedOpenRouterApiKey()?.trim();
    }
    return false;
  });

  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const howInView = useInView(howItWorksRef, { once: true, margin: "-100px" });

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

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 font-sans">

      {/* Mesh Gradient Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden flex justify-center">
        {/* Blue Orb */}
        <motion.div
          className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-[100%] bg-blue-400/20 blur-[120px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Amber Orb */}
        <motion.div
          className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] rounded-[100%] bg-amber-400/15 blur-[120px]"
          animate={{ x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Indigo Orb */}
        <motion.div
          className="absolute -bottom-[20%] left-[20%] w-[700px] h-[500px] rounded-[100%] bg-indigo-400/10 blur-[120px]"
          animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/50 bg-white px-4 sm:px-8 shadow-sm transition-all">
        <div className="flex items-center gap-2">
          <Link href="/">
            <img src="/navbar.png" alt="Artha Analytics" className="h-12 object-contain cursor-pointer transition-transform hover:scale-[1.02]" />
          </Link>
        </div>
        {user ? (
          <div className="flex items-center gap-3 font-mono text-[13px] text-zinc-600">
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
            onClick={() => setShowAuth(true)}
            className="rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-inner shadow-white/10 px-4 py-2 sm:px-6 sm:py-2.5 font-mono text-[10px] sm:text-[12px] font-semibold tracking-wider text-white transition-all hover:from-zinc-700 hover:to-zinc-950 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          >
            LOGIN / SIGN UP
          </button>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative flex min-h-[65vh] flex-col items-center justify-center px-4 sm:px-6 py-12 text-center">

        {/* Master Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl md:text-7xl lg:leading-[1.1]"
        >
          Institutional-Grade Equity Research.{" "}
          <span className="bg-gradient-to-br from-amber-500 to-amber-700 bg-clip-text text-transparent">
            In 60 Seconds.
          </span>
        </motion.h1>

        {/* Catchy Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-2xl text-[16px] sm:text-[19px] leading-relaxed text-zinc-500"
        >
          Artha Analytics deploys a swarm of 5 specialized AI agents to analyze any NSE stock—debating technicals, fundamentals, and market sentiment to give you the ultimate trading edge.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
        >
          {user ? (
            <>
              <button
                onClick={() => router.push("/search")}
                className="group flex h-12 sm:h-14 items-center gap-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[15px] font-semibold tracking-wide text-white transition-all hover:scale-[1.02] hover:from-zinc-700 hover:to-zinc-950 hover:shadow-2xl active:scale-95 cursor-pointer"
              >
                <Search size={18} />
                Open Search Dashboard
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="group flex h-12 sm:h-14 items-center gap-2 rounded-full border border-black/10 bg-white px-6 sm:px-8 py-3 sm:py-3.5 text-[13px] sm:text-[15px] font-semibold tracking-wide text-zinc-700 shadow-sm transition-all hover:scale-[1.02] hover:border-black/20 hover:bg-zinc-50 hover:shadow-md active:scale-95 cursor-pointer"
              >
                View Past Analysis
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleTrySearch}
                className="group flex h-12 sm:h-14 items-center gap-2 sm:gap-3 rounded-full bg-blue-700 px-6 sm:px-8 text-[13px] sm:text-[15px] font-semibold tracking-wide text-white shadow-xl shadow-blue-900/20 transition-all hover:scale-105 hover:bg-blue-800 hover:shadow-2xl active:scale-95 cursor-pointer"
              >
                Start Free Analysis
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={handleAuth}
                className="flex h-12 sm:h-14 items-center justify-center rounded-full border border-black/10 bg-white px-6 sm:px-8 text-[13px] sm:text-[15px] font-semibold tracking-wide text-zinc-700 shadow-sm transition-all hover:scale-105 hover:border-black/20 hover:bg-zinc-50 hover:shadow-md active:scale-95 cursor-pointer"
              >
                Log In
              </button>
            </>
          )}
        </motion.div>


      </section>

      {/* ─── Bento Grid Features ─── */}
      <section className="relative bg-gradient-to-b from-white to-amber-50/10 px-4 py-12 lg:py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Intelligence, Not Guesswork.
            </h2>
            <p className="mt-4 text-[17px] text-zinc-500">
              The power of an entire research desk, distilled into a single platform.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 (Spans 2 columns on large screens) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 backdrop-blur-sm p-8 transition-all hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)] hover:border-blue-200/50 hover:ring-1 hover:ring-blue-500/20 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 lg:col-span-2"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200/50 text-blue-600 transition-transform group-hover:scale-110">
                <Brain size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-zinc-900">Multi-Agent Debate System</h3>
              <p className="max-w-md text-[16px] leading-relaxed text-zinc-500">
                Five specialized AI personas—Technical, Fundamental, Market, Sector, and News—analyze the exact same stock in parallel, cross-referencing insights to give you an unbiased, bulletproof thesis.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 backdrop-blur-sm p-8 transition-all hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)] hover:border-blue-200/50 hover:ring-1 hover:ring-blue-500/20 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200/50 text-blue-600 transition-transform group-hover:scale-110">
                <Zap size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-zinc-900">60-Second Reports</h3>
              <p className="text-[16px] leading-relaxed text-zinc-500">
                What takes an analyst hours, our AI does in seconds. Get deeply researched, beautifully formatted PDF reports instantly.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 backdrop-blur-sm p-8 transition-all hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)] hover:border-blue-200/50 hover:ring-1 hover:ring-blue-500/20 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200/50 text-blue-600 transition-transform group-hover:scale-110">
                <Activity size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-zinc-900">Deep Technicals</h3>
              <p className="text-[16px] leading-relaxed text-zinc-500">
                Automated RSI, MACD, Bollinger Bands, and Moving Averages translated into plain English actionable trends.
              </p>
            </motion.div>

            {/* Feature 4 (Spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-white/60 backdrop-blur-sm p-8 transition-all hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)] hover:border-blue-200/50 hover:ring-1 hover:ring-blue-500/20 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 lg:col-span-2"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200/50 text-blue-600 transition-transform group-hover:scale-110">
                <Layers size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-zinc-900">Pristine Dashboard UI</h3>
              <p className="max-w-md text-[16px] leading-relaxed text-zinc-500">
                A gorgeous, native-feeling dashboard complete with dynamic SVG charts, tabular data parsing, and structured navigation. It’s complex financial data, made beautiful.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative bg-gradient-to-b from-slate-50 to-blue-50/40 px-4 py-12 lg:py-16 sm:px-8 border-t border-slate-200/50">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Three Steps to Clarity.
            </h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: <Search size={28} />, step: "1", title: "Search", desc: "Enter any NSE-listed stock ticker to begin the process." },
              { icon: <Bot size={28} />, step: "2", title: "Analyze", desc: "Our 5 AI agents fetch data and debate in parallel." },
              { icon: <FileText size={28} />, step: "3", title: "Report", desc: "Instantly view the stunning, interactive dashboard." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.2 + (i * 0.1), ease: [0.16, 1, 0.3, 1] }}
                className="relative text-center"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-slate-200/50 bg-white/80 backdrop-blur-sm shadow-sm text-blue-600">
                  {s.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Step {s.step}: {s.title}</h3>
                <p className="mt-2 px-4 text-[15px] text-zinc-500">{s.desc}</p>

                {/* Connecting lines for desktop */}
                {i < 2 && (
                  <div className="absolute right-0 top-10 hidden w-[calc(100%-5rem)] translate-x-[50%] border-t-[1.5px] border-dashed border-black/10 sm:block" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6"
          >
            {user ? (
              <>
                <button
                  onClick={() => router.push("/search")}
                  className="group flex h-14 sm:h-14 w-full max-w-[280px] sm:max-w-none sm:w-auto items-center justify-center gap-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] px-6 sm:px-8 text-[14px] sm:text-[15px] font-semibold tracking-wide text-white transition-all hover:scale-[1.02] hover:from-zinc-700 hover:to-zinc-950 hover:shadow-2xl active:scale-95 cursor-pointer"
                >
                  Enter the Dashboard
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="group flex h-14 sm:h-14 w-full max-w-[280px] sm:max-w-none sm:w-auto items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 sm:px-8 text-[14px] sm:text-[15px] font-semibold tracking-wide text-zinc-700 shadow-sm transition-all hover:scale-[1.02] hover:border-black/20 hover:bg-zinc-50 hover:shadow-md active:scale-95 cursor-pointer"
                >
                  View Past Analysis
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </>
            ) : (
              <button
                onClick={handleTrySearch}
                className="group mt-6 flex h-12 sm:h-14 w-full max-w-[280px] sm:max-w-none sm:w-auto items-center justify-center gap-2 rounded-full bg-blue-700 px-6 sm:px-10 text-[14px] sm:text-[15px] font-semibold tracking-wide text-white shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] hover:bg-blue-800 hover:shadow-2xl active:scale-95 cursor-pointer"
              >
                Start Free Analysis
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <Footer />

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
          onLogout={handleLogout}
        />
      )}
      
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