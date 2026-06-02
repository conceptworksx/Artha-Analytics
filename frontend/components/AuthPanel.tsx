"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, User, Eye, EyeOff } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { Toaster, toast } from "sonner";
import Script from "next/script";
import { AnalysisError, authRequest, authenticateWithGoogle, saveAuthSession, type AuthUser } from "@/lib/api";

type Tab = "login" | "signup";

const colTrans = (delay = 0) => ({
  x: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay },
  opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay },
  layout: { type: "spring", stiffness: 220, damping: 26 },
});

export function AuthPanel({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successCallbackRef = useRef<any>(null);
  useEffect(() => { successCallbackRef.current = handleGoogleSuccess; });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const session = await authRequest({ mode: tab, email, password, name });
      saveAuthSession(session);
      toast.success(tab === "login" ? "Logged in successfully!" : "Account created successfully!");
      onAuthed(session.user);
    } catch (err) {
      const errMsg = err instanceof AnalysisError ? err.message : "Unable to authenticate right now.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("Password reset link is not configured for local dev.");
  };

  const handleGoogleSuccess = async (response: any) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authenticateWithGoogle(response.credential);
      saveAuthSession(session);
      toast.success("Signed in with Google successfully!");
      onAuthed(session.user);
    } catch (err) {
      const errMsg = err instanceof AnalysisError ? err.message : "Google sign in failed.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogleGis = () => {
      const google = (window as any).google;
      if (google) {
        if (!(window as any).__googleGisInitialized) {
          google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: (res: any) => successCallbackRef.current?.(res),
            auto_select: false,
          });
          (window as any).__googleGisInitialized = true;
        }
        const btnEl = document.getElementById("google-signin-btn");
        if (btnEl) {
          google.accounts.id.renderButton(btnEl, {
            theme: "filled_black",
            size: "large",
            width: 312,
            text: "continue_with",
            shape: "rectangular",
          });
        } else {
          setTimeout(initGoogleGis, 100);
        }
      }
    };

    if ((window as any).google) {
      initGoogleGis();
    } else {
      window.addEventListener("google-gis-loaded", initGoogleGis);
    }
    return () => window.removeEventListener("google-gis-loaded", initGoogleGis);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-black">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event("google-gis-loaded"))}
      />
      <Toaster richColors position="top-center" />

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* Floating gold particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-[#d4a84c]/60"
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 w-full max-w-[900px] mx-auto">
        <motion.div layout className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Left Column: Logo + AI info */}
          <motion.div
            layout
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={colTrans(0)}
            className={`flex flex-col items-center text-center ${tab === "login" ? "md:order-2" : "md:order-1"}`}
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-[#d4a84c]/10 blur-2xl" />
              <img src="/landing_hero.png" alt="Artha Logo" className="relative h-72 w-72 object-contain md:h-80 md:w-80" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-black md:text-3xl font-sans">Artha Analytics</h1>
            <p className="mt-3 text-sm font-semibold tracking-wider text-[#d4a84c] font-mono">Multi-Agent AI. Singular Market Edge</p>
          </motion.div>

          {/* Right Column: Card */}
          <motion.div
            layout
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={colTrans(0.1)}
            className={`w-full max-w-[360px] mx-auto ${tab === "login" ? "md:order-1" : "md:order-2"}`}
          >
            <motion.div
              className="relative rounded-2xl border border-black/10 bg-white/70 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] backdrop-blur-xl h-[465px] flex flex-col justify-between w-full"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {/* Gold border glow */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#d4a84c]/20 via-transparent to-black/10 opacity-50 [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-px" />

              {/* Tabs */}
              <div className="relative mb-5 grid grid-cols-2 rounded-lg border border-black/10 bg-neutral-100/60 p-1">
                {(["login", "signup"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    id={`tab-${t}-btn`}
                    onClick={() => { setTab(t); setError(null); }}
                    className={`relative z-10 py-2 text-xs font-semibold tracking-[0.2em] transition-colors ${tab === t ? "text-white" : "text-neutral-600 hover:text-black"}`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="absolute inset-y-1 w-1/2 rounded-md bg-black shadow"
                  style={{ left: tab === "login" ? "0.25rem" : "calc(50% - 0.25rem)" }}
                />
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={tab}
                  initial={{ opacity: 0, x: tab === "login" ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tab === "login" ? 15 : -15 }}
                  transition={{ duration: 0.25 }}
                  className="flex-1 flex flex-col justify-between"
                  onSubmit={submit}
                >
                  <div className="space-y-3.5">
                    {tab === "signup" && (
                      <Field
                        id="signup-name-input"
                        icon={<User size={14} />}
                        label="NAME"
                        type="text"
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    )}
                    <Field
                      id="auth-email-input"
                      icon={<Mail size={14} />}
                      label="EMAIL"
                      type="email"
                      placeholder="you@artha.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Field
                      id="auth-password-input"
                      icon={<Lock size={14} />}
                      label="PASSWORD"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                    />
                    {tab === "login" && (
                      <div className="flex justify-end">
                        <a id="forgot-password-link" href="#" onClick={handleForgotPassword} className="text-[11px] text-neutral-500 transition-colors hover:text-[#d4a84c]">
                          Forgot password?
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-red-500 text-center tracking-wide">
                        {error}
                      </motion.p>
                    )}
                    <motion.button
                      id="auth-submit-btn"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={loading}
                      className="group relative w-full overflow-hidden rounded-lg bg-black py-2.5 text-xs font-semibold tracking-[0.3em] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        {loading ? "PLEASE WAIT..." : tab === "login" ? "LOGIN" : "CREATE ACCOUNT"}
                        {!loading && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
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
                </motion.form>
              </AnimatePresence>

              <div className="my-3.5 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-[9px] tracking-[0.3em] text-neutral-400">OR</span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <div className="group relative w-full h-[40px] flex justify-center mt-1">
                {/* Visual custom button */}
                <div className="relative w-full h-full overflow-hidden rounded-lg bg-black text-white flex items-center justify-center font-semibold text-xs tracking-[0.2em] border border-black/10 cursor-pointer select-none transition-all duration-200 group-hover:scale-[1.01]">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <FaGoogle size={13} className="text-white" />
                    CONTINUE WITH GOOGLE
                  </span>
                </div>
                {/* Google Native button overlay */}
                <div id="google-signin-btn" className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer overflow-hidden [&_iframe]:w-full [&_iframe]:h-full" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

function Field({ icon, label, type, placeholder, value, onChange, id, required, minLength, autoComplete }: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="group">
      <label className="mb-1 block text-[9px] font-semibold tracking-[0.2em] text-neutral-500">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-[#d4a84c]">{icon}</span>
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-black/10 bg-white/60 py-2.5 pl-9 pr-10 text-sm text-black placeholder:text-neutral-400 transition-all focus:border-[#d4a84c] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d4a84c]/15"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
