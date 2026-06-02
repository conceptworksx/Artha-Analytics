"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, User, Lock, Key, X } from "lucide-react";
import { toast } from "sonner";
import {
  changePassword,
  getAuthToken,
  verifyGroqApiKey,
  getSavedGroqApiKey,
  saveGroqApiKey,
  AnalysisError,
  type AuthUser,
} from "@/lib/api";

interface ProfileDialogProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDialog({ user, isOpen, onClose }: ProfileDialogProps) {
  const [keyState, setKeyState] = useState({ value: "", visible: false, loading: false });
  const [pwState, setPwState] = useState({ error: null as string | null, loading: false });

  useEffect(() => {
    if (isOpen) {
      setKeyState({ value: getSavedGroqApiKey(), visible: false, loading: false });
      setPwState({ error: null, loading: false });
    }
  }, [isOpen]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToSave = keyState.value.trim();

    if (!keyToSave) {
      saveGroqApiKey("");
      toast.success("Groq API Key cleared successfully.");
      return;
    }

    setKeyState((prev) => ({ ...prev, loading: true }));
    try {
      const token = getAuthToken();
      await verifyGroqApiKey({ groqApiKey: keyToSave, authToken: token });
      saveGroqApiKey(keyToSave);
      toast.success("Groq API Key verified & saved successfully!");
    } catch (err) {
      const errMsg = err instanceof AnalysisError ? err.message : "Invalid Groq API Key.";
      toast.error(errMsg);
    } finally {
      setKeyState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwState({ error: null, loading: false });

    const formData = new FormData(e.currentTarget);
    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    if (newPassword.length < 8) {
      const errMsg = "New password must be at least 8 characters.";
      setPwState((prev) => ({ ...prev, error: errMsg }));
      toast.error(errMsg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const errMsg = "New passwords do not match.";
      setPwState((prev) => ({ ...prev, error: errMsg }));
      toast.error(errMsg);
      return;
    }

    setPwState((prev) => ({ ...prev, loading: true }));
    try {
      const token = getAuthToken();
      await changePassword({ currentPassword, newPassword, authToken: token });
      toast.success("Password changed successfully!");
      e.currentTarget.reset();
    } catch (err) {
      const errMsg = err instanceof AnalysisError ? err.message : "Failed to change password.";
      setPwState((prev) => ({ ...prev, error: errMsg }));
      toast.error(errMsg);
    } finally {
      setPwState((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-2xl z-10 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a84c]/10 text-[#d4a84c]">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold tracking-wide text-black">PROFILE SETTINGS</h3>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">Manage your account</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* User Info (Read-Only) */}
            <div className="rounded-xl border border-black/5 bg-neutral-50/50 p-4 font-mono text-[12px] flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">NAME:</span>
                <span className="font-bold text-black">{user.name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">EMAIL:</span>
                <span className="font-bold text-black">{user.email}</span>
              </div>
            </div>

            {/* Groq API Key Section */}
            <form onSubmit={handleSaveApiKey} className="flex flex-col gap-2.5">
              <label className="font-mono text-[10px] font-bold tracking-wider text-neutral-500">GROQ API KEY</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Key size={14} />
                </span>
                <input
                  type={keyState.visible ? "text" : "password"}
                  placeholder="gsk_..."
                  value={keyState.value}
                  onChange={(e) => setKeyState((prev) => ({ ...prev, value: e.target.value }))}
                  className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-10 text-xs font-mono text-black placeholder:text-neutral-300 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                />
                <button
                  type="button"
                  onClick={() => setKeyState((prev) => ({ ...prev, visible: !prev.visible }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                >
                  {keyState.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-sans text-[10px] text-neutral-500">
                  Don&apos;t have a key?{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d4a84c] hover:underline font-semibold"
                  >
                    Get one here
                  </a>
                </span>
                <button
                  type="submit"
                  disabled={keyState.loading}
                  className="rounded-lg bg-black px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {keyState.loading ? "VERIFYING..." : "SAVE API KEY"}
                </button>
              </div>
            </form>

            <div className="h-px bg-black/5" />

            {/* Change Password Section */}
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <label className="font-mono text-[10px] font-bold tracking-wider text-neutral-500">CHANGE PASSWORD</label>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={14} />
                  </span>
                  <input
                    name="currentPassword"
                    type="password"
                    placeholder="Current Password"
                    required
                    className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-3 text-xs text-black placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={14} />
                  </span>
                  <input
                    name="newPassword"
                    type="password"
                    placeholder="New Password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-3 text-xs text-black placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={14} />
                  </span>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm New Password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-3 text-xs text-black placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                  />
                </div>
              </div>

              {pwState.error && (
                <p className="text-[10px] font-bold text-red-500 tracking-wide">{pwState.error}</p>
              )}

              <button
                type="submit"
                disabled={pwState.loading}
                className="self-end rounded-lg bg-black px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {pwState.loading ? "CHANGING..." : "UPDATE PASSWORD"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
