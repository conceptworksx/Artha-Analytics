"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Key, ArrowRight, Eye, EyeOff, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { AnalysisError, saveOpenRouterApiKey, verifyOpenRouterApiKey, getAuthToken } from "@/lib/api";

interface BYOKCardProps {
  onSuccess?: () => void;
  onKeySaved?: () => void; // backwards compatibility for AppGate
  onLogout?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function BYOKCard({
  onSuccess,
  onKeySaved,
  onLogout,
  onClose,
  isModal = false,
}: BYOKCardProps) {
  const [apiKey, setApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError("Please enter an OpenRouter API key.");
      return;
    }

    if (!trimmedKey.startsWith("sk-or-v1-")) {
      setError("Invalid format. OpenRouter API keys usually start with 'sk-or-v1-'.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();

      // Verify key against the backend verify route
      await verifyOpenRouterApiKey({ openrouterApiKey: trimmedKey, authToken: token || undefined });

      // Save key in localStorage
      saveOpenRouterApiKey(trimmedKey);
      toast.success("API Keys verified and saved successfully!");
      if (onSuccess) onSuccess();
      if (onKeySaved) onKeySaved();
    } catch (err) {
      if (err instanceof AnalysisError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const cardBody = (
    <motion.div
      initial={isModal ? { opacity: 0, scale: 0.95, y: 10 } : { opacity: 0, scale: 0.98 }}
      animate={isModal ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1 }}
      exit={isModal ? { opacity: 0, scale: 0.95, y: 10 } : undefined}
      transition={{
        duration: isModal ? 0.4 : 0.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`w-full max-w-[420px] mx-auto ${isModal ? "relative z-10" : ""}`}
    >
      <div className={`relative overflow-hidden rounded-2xl border border-black/10 pt-10 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col w-full space-y-5 sm:space-y-6 ${
        isModal ? "bg-white" : "bg-white/70 backdrop-blur-xl min-h-[400px]"
      }`}>
        {/* Gold border glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#d4a84c]/20 via-transparent to-black/10 opacity-50 [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-px" />

        {/* Close Button (Modal only) */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 text-neutral-400 hover:text-black transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        )}

        {/* Header */}
        <div className="text-center">
          <h2 className="font-mono text-sm font-bold tracking-[0.25em] text-black uppercase">
            Bring Your Own Key
          </h2>
          <div className="mt-2 h-0.5 w-12 bg-[#d4a84c] mx-auto rounded-full" />
        </div>

        {/* Explanation lines */}
        <div className="space-y-3 sm:space-y-4 text-center px-1 sm:px-2">
          <p className="text-xs text-neutral-600 leading-relaxed font-sans">
            Artha Analytics runs on a Bring Your Own Key (BYOK) architecture. This allows you to power our multi-agent reasoning system using your own custom model access.
          </p>
          <p className="text-[11px] text-[#d4a84c] font-medium font-sans">
            If you do not have an API key, you can generate one for free in the{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#f0c97a] transition-colors"
            >
              OpenRouter Console
            </a>
            .
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="mb-1.5 block text-[9px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                OpenRouter API Key
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-[#d4a84c]">
                  <Key size={14} />
                </span>
                <input
                  id={isModal ? "modal-byok-api-key" : "byok-api-key"}
                  type={showKey ? "text" : "password"}
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  className="block h-10 w-full rounded-lg border border-black/10 bg-neutral-50/50 pl-9 pr-10 font-mono text-[13px] placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-0 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>



            {error && (
              <p className="text-[11px] font-semibold text-red-500 text-center tracking-wide">
                {error}
              </p>
            )}
          </div>

          {/* Submit button and sign out */}
          <div className="space-y-4">
            <motion.button
              id={isModal ? "modal-byok-submit-btn" : "byok-submit-btn"}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-lg bg-black py-2.5 text-xs font-semibold tracking-[0.3em] text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {loading ? "VERIFYING KEY..." : isModal ? "VERIFY & SEARCH" : "ACTIVATE KEY & CONTINUE"}
                {!loading && (
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </span>
              {!loading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#d4a84c] via-[#f0c97a] to-[#d4a84c]"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );

  if (isModal) {
    return cardBody;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-black">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-gradient-to-br from-[#d4a84c]/10 to-transparent blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-gradient-to-br from-[#d4a84c]/5 to-transparent blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:24px_24px] opacity-70" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        {cardBody}
      </div>
    </main>
  );
}
