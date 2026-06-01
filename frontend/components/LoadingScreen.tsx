import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import DebateLoader from "./DebateLoader";
import type { AuthUser } from "@/lib/api";

const STEPS = [
  "Fetching news signals",
  "Running technical analysis",
  "Evaluating fundamentals",
  "Scanning market & sector data",
  "Bull-Bear debate in session...",
  "Manager reviewing verdict",
];

export function LoadingScreen({
  ticker,
  user,
  onLogout,
}: {
  ticker: string;
  user?: AuthUser;
  onLogout?: () => void;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);

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

        {user && onLogout ? (
          <div className="flex items-center gap-4 font-mono text-[12px] text-[var(--muted-foreground)]">
            <span className="hidden sm:inline truncate max-w-[240px]">
              {user.name || user.email.split("@")[0]}
            </span>
            <span className="h-4 w-px bg-[var(--border)] hidden sm:block" />
            <button
              type="button"
              onClick={onLogout}
              className="text-[var(--foreground)] hover:text-[#d4a84c] transition-colors font-semibold tracking-wider cursor-pointer"
            >
              LOGOUT
            </button>
          </div>
        ) : (
          <>
            <div className="font-mono text-[13px] text-[var(--muted-foreground)]">
              {ticker.split(".")[0].toUpperCase()}.NS · NSE
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="font-mono text-[14px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                ← New Analysis
              </Link>
            </div>
          </>
        )}
      </header>

      {/* Main loading content container */}
      <div className="flex flex-1 items-center justify-center px-6 z-10">
        <div className="w-full max-w-[420px] text-center flex flex-col items-center">
          <h1 className="font-mono text-[14px] tracking-[0.2em] font-semibold text-black">
            ARTHA ANALYTICS
          </h1>
          <div className="mx-auto my-3 h-px w-full bg-black/10" />
          <p className="font-mono text-[13px] text-neutral-600 font-semibold">
            Initialising agents for {ticker.split(".")[0].toUpperCase()}...
          </p>
          <div className="my-6 w-full flex justify-center">
            <DebateLoader />
          </div>
          <p className="font-mono text-[13px] text-neutral-800 font-medium tracking-wide">
            {STEPS[step]}
          </p>
        </div>
      </div>
    </div>
  );
}
