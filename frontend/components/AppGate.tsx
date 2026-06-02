"use client";

import { useEffect, useState } from "react";
import { clearAuthSession, getAuthUser, type AuthUser } from "@/lib/api";
import { AuthPanel } from "@/components/AuthPanel";
import { TickerSearch } from "@/components/TickerSearch";

export function AppGate() {
  const [showIntro, setShowIntro] = useState(true);
  const [fadeOutIntro, setFadeOutIntro] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());

    const fadeTimeout = setTimeout(() => setFadeOutIntro(true), 2600);
    const removeTimeout = setTimeout(() => setShowIntro(false), 3100);

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
  };

  return (
    <>
      {showIntro && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-black transition-opacity duration-500 ${
            fadeOutIntro ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="text-center">
            <div className="candle-wrapper">
              <div className="candle-chart">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="candle" />
                ))}
              </div>
            </div>
            <h1 className="mt-6 animate-pulse font-mono text-[13px] uppercase tracking-[0.25em] text-black">
              Artha Analytics
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              Connecting to Indian markets
            </p>
          </div>
        </div>
      )}

      <div
        className={`transition-all duration-700 ${
          fadeOutIntro ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {user ? (
          <TickerSearch user={user} onLogout={handleLogout} />
        ) : (
          <AuthPanel onAuthed={setUser} />
        )}
      </div>
    </>
  );
}
