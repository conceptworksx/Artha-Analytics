"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Key, ArrowRight, Eye, EyeOff, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AnalysisError, saveGroqApiKey, verifyGroqApiKey, getAuthToken } from "@/lib/api";

interface BYOKCardProps {
  onKeySaved: () => void;
  onLogout: () => void;
}

export function BYOKCard({ onKeySaved, onLogout }: BYOKCardProps) {
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
      if (!token) {
        throw new Error("You must be logged in to save an API key.");
      }

      // Verify key against the backend verify route
      await verifyGroqApiKey({ groqApiKey: trimmedKey, authToken: token });

      // Save key in localStorage associated with the current user session
      saveGroqApiKey(trimmedKey);
      toast.success("Groq API Key verified and saved successfully!");
      onKeySaved();
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
    <main className="relative min-h-screen overflow-hidden bg-white text-black">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-gradient-to-br from-[#d4a84c]/10 to-transparent blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-gradient-to-br from-[#d4a84c]/5 to-transparent blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:24px_24px] opacity-70" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] mx-auto"
        >
          <div className="relative rounded-2xl border border-black/10 bg-white/70 pt-12 pb-8 px-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] backdrop-blur-xl flex flex-col justify-between w-full min-h-[490px]">
            {/* Gold border glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#d4a84c]/20 via-transparent to-black/10 opacity-50 [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-px" />

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="font-mono text-sm font-bold tracking-[0.25em] text-black uppercase">
                Bring Your Own Key
              </h2>
              <div className="mt-2 h-0.5 w-12 bg-[#d4a84c] mx-auto rounded-full" />
            </div>

            {/* Explanation lines */}
            <div className="space-y-4 text-center px-2 mb-6">
              <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                Artha Analytics runs on a Bring Your Own Key (BYOK) architecture. This allows you to power our multi-agent reasoning system using your own custom model access.
              </p>
              <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                Security is our priority. <br />
                We do not store, view, or log your keys on our servers.
              </p>
              <p className="text-[11px] text-[#d4a84c] font-medium font-sans">
                If you do not have an API key, you can generate one for free in the{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#f0c97a] transition-colors"
                >
                  Groq Console
                </a>
                .
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="group">
                  <label className="mb-1 block text-[9px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                    Groq API Key
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-[#d4a84c]">
                      <Key size={14} />
                    </span>
                    <input
                      id="byok-api-key"
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

              {/* Submit button and sign out */}
              <div className="space-y-4 mt-6">
                <motion.button
                  id="byok-submit-btn"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-lg bg-black py-2.5 text-xs font-semibold tracking-[0.3em] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {loading ? "VERIFYING KEY..." : "ACTIVATE KEY & CONTINUE"}
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

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-neutral-500 hover:text-black transition-colors cursor-pointer"
                  >
                    <LogOut size={12} />
                    LOG OUT
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
