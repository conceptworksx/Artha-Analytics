import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RiRobot3Line } from "react-icons/ri";
import { BiMessageRoundedDots } from "react-icons/bi";
import type { AuthUser } from "@/lib/api";
import { Search } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#fafafa] text-zinc-900 font-sans">
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

      {/* Navbar matching report page style */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-black/[0.04] bg-gradient-to-r from-white/60 via-amber-50/30 to-white/60 px-4 sm:px-8 backdrop-blur-2xl transition-all">
        <div className="flex items-center">
          <Link href="/">
            <img
              src="/navbar.png"
              alt="Artha Analytics"
              className="h-10 sm:h-14 object-contain cursor-pointer"
            />
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-[12px] text-[var(--muted-foreground)]">
            <span className="hidden sm:inline truncate max-w-[240px]">
              {user.name || user.email.split("@")[0]}
            </span>
          </div>
        ) : (
          <>
            <div className="hidden sm:block font-mono text-[13px] text-[var(--muted-foreground)]">
              {ticker.split(".")[0].toUpperCase()}.NS · NSE
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] font-sans text-[11px] sm:text-[13px] font-medium text-white transition-all hover:scale-105 hover:from-zinc-700 hover:to-zinc-950 hover:shadow-md active:scale-95 cursor-pointer"
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
        <div className="w-full max-w-[480px] text-center flex flex-col items-center">
          <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-zinc-900">
            Analysing {ticker.split(".")[0].toUpperCase()}
          </h1>
          <div className="mx-auto my-4 h-px w-full bg-black/5" />
          <p className="text-[15px] text-zinc-500 font-medium">
            Initialising agents for deeper research...
          </p>
            <div className="debate mx-auto my-8 scale-110">
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
              <div className="robot right text-rose-500">
                <RiRobot3Line />
              </div>
            </div>
          <p className="text-[16px] text-zinc-800 font-medium tracking-wide animate-pulse mt-4">
            {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Footer pushed to the bottom of the page */}
      <Footer />
    </div>
  );
}
