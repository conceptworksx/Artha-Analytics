"use client";

import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { clearAuthSession, getAuthUser, getSavedGroqApiKey, type AuthUser } from "@/lib/api";
import { AuthCard } from "@/components/auth/AuthCard";
import { SearchView } from "@/components/research/SearchView";
import { BYOKCard } from "@/components/auth/BYOKCard";

let introAlreadyShown = false;

export function AppGate() {
  const [showIntro, setShowIntro] = useState(!introAlreadyShown);
  const [fadeOutIntro, setFadeOutIntro] = useState(introAlreadyShown);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const authedUser = getAuthUser();
    setUser(authedUser);
    if (authedUser) {
      setHasSavedKey(!!getSavedGroqApiKey()?.trim());
    }

    // Check query params for guest limit reached redirect
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("limit_reached") === "true") {
        setShowAuth(true);
        const errMsg = "You have reached the limit of 3 free searches. Please sign up or log in to search more.";
        setAuthError(errMsg);
        toast.error(errMsg, {
          duration: 5000,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    if (introAlreadyShown) {
      return;
    }

    const fadeTimeout = setTimeout(() => {
      setFadeOutIntro(true);
      introAlreadyShown = true;
    }, 2600);
    const removeTimeout = setTimeout(() => setShowIntro(false), 3100);

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, []);

  const handleAuthed = (authedUser: AuthUser) => {
    setUser(authedUser);
    setHasSavedKey(!!getSavedGroqApiKey()?.trim());
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setHasSavedKey(false);
    setShowAuth(false);
    setAuthError(null);
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
          hasSavedKey ? (
            <SearchView user={user} onLogout={handleLogout} />
          ) : (
            <BYOKCard onKeySaved={() => setHasSavedKey(true)} onLogout={handleLogout} />
          )
        ) : showAuth ? (
          <AuthCard
            onAuthed={handleAuthed}
            onClose={() => {
              setShowAuth(false);
              setAuthError(null);
            }}
          />
        ) : (
          <SearchView onLoginClick={() => setShowAuth(true)} />
        )}
      </div>
      <Toaster richColors position="top-center" />
    </>
  );
}
