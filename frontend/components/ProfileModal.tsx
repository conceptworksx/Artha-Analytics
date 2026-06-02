"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, User, Lock, Key, X } from "lucide-react";
import { toast } from "sonner";
import {
  changePassword,
  getAuthToken,
  verifyGroqApiKey,
  AnalysisError,
  type AuthUser,
} from "@/lib/api";

interface ProfileModalProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ user, isOpen, onClose }: ProfileModalProps) {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroqApiKey(localStorage.getItem("groq_api_key") || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
    }
  }, [isOpen]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToSave = groqApiKey.trim();

    if (!keyToSave) {
      localStorage.removeItem("groq_api_key");
      toast.success("Groq API Key cleared successfully.");
      return;
    }

    setKeyLoading(true);
    try {
      const token = getAuthToken();
      await verifyGroqApiKey({ groqApiKey: keyToSave, authToken: token });
      localStorage.setItem("groq_api_key", keyToSave);
      toast.success("Groq API Key verified & saved successfully!");
    } catch (err) {
      const errMsg = err instanceof AnalysisError ? err.message : "Invalid Groq API Key.";
      toast.error(errMsg);
    } finally {
      setKeyLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      toast.error("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = getAuthToken();
      await changePassword({
        currentPassword,
        newPassword,
        authToken: token,
      });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errMsg =
        err instanceof AnalysisError ? err.message : "Failed to change password.";
      setPasswordError(errMsg);
      toast.error(errMsg);
    } finally {
      setPasswordLoading(false);
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
                  <h3 className="font-sans text-sm font-bold tracking-wide text-black">
                    PROFILE SETTINGS
                  </h3>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
                    Manage your account
                  </p>
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
              <label className="font-mono text-[10px] font-bold tracking-wider text-neutral-500">
                GROQ API KEY
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Key size={14} />
                </span>
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="gsk_..."
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-10 text-xs font-mono text-black placeholder:text-neutral-300 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
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
                  disabled={keyLoading}
                  className="rounded-lg bg-black px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {keyLoading ? "VERIFYING..." : "SAVE API KEY"}
                </button>
              </div>
            </form>

            <div className="h-px bg-black/5" />

            {/* Change Password Section */}
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <label className="font-mono text-[10px] font-bold tracking-wider text-neutral-500">
                CHANGE PASSWORD
              </label>

              <div className="flex flex-col gap-2">
                {/* Current Password */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-3 text-xs text-black placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                  />
                </div>

                {/* New Password */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-3 text-xs text-black placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                  />
                </div>

                {/* Confirm New Password */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-3 text-xs text-black placeholder:text-neutral-400 focus:border-[#d4a84c] focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/10"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-[10px] font-bold text-red-500 tracking-wide">
                  {passwordError}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="self-end rounded-lg bg-black px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {passwordLoading ? "CHANGING..." : "UPDATE PASSWORD"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
