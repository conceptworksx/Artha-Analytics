"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, ArrowRight, Eye, EyeOff, X, Shield, Lock, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { AnalysisError, saveGroqApiKey, verifyGroqApiKey, getAuthToken } from "@/lib/api";

interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BYOKModal({ isOpen, onClose, onSuccess }: BYOKModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError("Please enter a Groq API key.");
      return;
    }

    if (!trimmedKey.startsWith("gsk_")) {
      setError("Invalid format. Groq API keys usually start with 'gsk_'.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();

      // Verify key against the backend verify route (token is optional for guests)
      await verifyGroqApiKey({ groqApiKey: trimmedKey, authToken: token || undefined });

      // Save key in localStorage
      saveGroqApiKey(trimmedKey);
      toast.success("Groq API Key verified and saved successfully!");
      onSuccess();
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          {/* Backdrop click listener to close */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[440px]"
          >
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white pt-14 pb-8 px-6 shadow-2xl flex flex-col justify-between w-full min-h-[480px]">
              {/* Gold border glow decoration */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#d4a84c]/20 via-transparent to-black/10 opacity-50 [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-px" />

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-20 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="font-mono text-[12px] font-bold tracking-[0.25em] text-black uppercase">
                  Bring Your Own Key
                </h2>
                <div className="mt-1.5 h-0.5 w-10 bg-[#d4a84c] mx-auto rounded-full" />
              </div>

              {/* Security copy blocks */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 text-[#d4a84c] shrink-0">
                    <Lock size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-semibold tracking-wider text-black uppercase font-mono">
                      Client-Side Storage
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed font-sans mt-0.5">
                      Your API key is saved locally in your browser's secure storage. It never touches our servers or databases.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 text-[#d4a84c] shrink-0">
                    <Shield size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-semibold tracking-wider text-black uppercase font-mono">
                      Direct Inference
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed font-sans mt-0.5">
                      Keys are transmitted directly to Groq's API via secure HTTPS headers solely to process your search queries.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 text-[#d4a84c] shrink-0">
                    <CircleDollarSign size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-semibold tracking-wider text-black uppercase font-mono">
                      Zero Markups
                    </h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed font-sans mt-0.5">
                      Artha Analytics is free to use. You only pay Groq for the tokens you actually consume.
                    </p>
                  </div>
                </div>

                <div className="text-center pt-1 border-t border-neutral-100">
                  <p className="text-[11px] text-[#d4a84c] font-medium font-sans">
                    Need a key? Generate one for free in the{" "}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#f0c97a] transition-colors"
                    >
                      Groq Console
                    </a>.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="group">
                    <label className="mb-1 block text-[9px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">
                      Groq API Key
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-[#d4a84c]">
                        <Key size={14} />
                      </span>
                      <input
                        id="modal-byok-api-key"
                        type={showKey ? "text" : "password"}
                        placeholder="gsk_..."
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

                {/* Submit button */}
                <div className="mt-6">
                  <motion.button
                    id="modal-byok-submit-btn"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-lg bg-black py-2.5 text-xs font-semibold tracking-[0.3em] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      {loading ? "VERIFYING KEY..." : "VERIFY & SEARCH"}
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
        </div>
      )}
    </AnimatePresence>
  );
}
