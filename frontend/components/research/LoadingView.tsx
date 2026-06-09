import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RiRobot3Line } from "react-icons/ri";
import { BiMessageRoundedDots } from "react-icons/bi";
import type { AuthUser } from "@/lib/api";
import { Search } from "lucide-react";

const STEPS = [
  "Fetching news signals",
  "Running technical analysis",
  "Evaluating fundamentals",
  "Scanning market & sector data",
  "Bull-Bear debate in session...",
  "Manager reviewing verdict",
];

export function LoadingView({
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
      <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white/70 backdrop-blur-md px-3 sm:px-5 w-full z-10">
        <div className="flex items-center">
          <Link href="/">
            <img
              src="/navbar.png"
              alt="Artha Analytics"
              className="h-10 sm:h-14 object-contain cursor-pointer"
            />
          </Link>
        </div>

        {user && onLogout ? (
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-[12px] text-[var(--muted-foreground)]">
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
            <div className="hidden sm:block font-mono text-[13px] text-[var(--muted-foreground)]">
              {ticker.split(".")[0].toUpperCase()}.NS · NSE
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-lg border border-black/10 bg-zinc-50/50 font-mono text-[11px] sm:text-[13px] font-medium text-zinc-800 hover:bg-black hover:text-white transition-all duration-300 hover:shadow-md hover:border-black active:scale-[0.98]"
              >
                <Search size={14} />
                <span className="hidden sm:inline">New Analysis</span>
              </Link>
            </div>
          </>
        )}
      </header>

      {/* Main loading content container */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 z-10">
        <div className="w-full max-w-[420px] text-center flex flex-col items-center">
          <h1 className="font-mono text-[14px] tracking-[0.2em] font-semibold text-black">
            ARTHA ANALYTICS
          </h1>
          <div className="mx-auto my-3 h-px w-full bg-black/10" />
          <p className="font-mono text-[13px] text-neutral-600 font-semibold">
            Initialising agents for {ticker.split(".")[0].toUpperCase()}...
          </p>
            <div className="debate mx-auto my-4">
              {/* Left Robot */}
              <div className="robot left">
                <RiRobot3Line />
              </div>

              {/* Left Thinking Bubble */}
              <div className="thinking-bubble left-thinking">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>

              {/* Message flying Left to Right */}
              <div className="message send-right">
                <BiMessageRoundedDots />
              </div>

              {/* Right Thinking Bubble */}
              <div className="thinking-bubble right-thinking">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>

              {/* Message flying Right to Left */}
              <div className="message send-left">
                <BiMessageRoundedDots />
              </div>

              {/* Right Robot */}
              <div className="robot right">
                <RiRobot3Line />
              </div>
            </div>
          <p className="font-mono text-[13px] text-neutral-800 font-medium tracking-wide">
            {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Footer pushed to the bottom of the page */}
      <footer className="w-full py-5 border-t border-[var(--border)] bg-zinc-50/20 flex flex-col items-center gap-1.5 font-mono tracking-wider text-[var(--label)] text-center mt-auto z-10">
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
    </div>
  );
}
