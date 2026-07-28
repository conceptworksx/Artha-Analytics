export interface AnalyseResponse {
  ticker: string;
  news_report: any;
  technical_report: any;
  fundamental_report: any;
  market_report: any;
  sector_report: string;
  status: string;
  company_info?: any;
  fundamental_data?: any;
  technical_data?: any;
  market_data?: any;
  company_news?: any;
  indian_news?: any;
  global_news?: any;
  historical_prices?: any[];

  charts_data?: {
    technical_history: Array<{
      date: string;
      close: number | null;
      ma50: number | null;
      ma200: number | null;
      bb_upper: number | null;
      bb_lower: number | null;
      bb_mid: number | null;
      rsi: number | null;
      volume: number | null;
    }>;
    financials_history: {
      income_stmt: {
        revenue?: Record<string, number | null>;
        ebitda?: Record<string, number | null>;
        net_income?: Record<string, number | null>;
        eps_diluted?: Record<string, number | null>;
      };
      balance_sheet: {
        cash?: Record<string, number | null>;
        total_liabilities?: Record<string, number | null>;
        total_debt?: Record<string, number | null>;
        shareholders_equity?: Record<string, number | null>;
      };
      cash_flow: {
        operating_cash_flow?: Record<string, number | null>;
        free_cash_flow?: Record<string, number | null>;
      };
      ratios: {
        net_margin_pct?: Record<string, number | null>;
        roe_pct?: Record<string, number | null>;
        roce_pct?: Record<string, number | null>;
        debt_to_equity?: Record<string, number | null>;
        interest_coverage?: Record<string, number | null>;
      };
    };
  };
}

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_BASE_URL = "http://localhost:8000";

const AUTH_TOKEN_KEY = "artha_auth_token";
const AUTH_USER_KEY = "artha_auth_user";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function normalizeTicker(ticker: string) {
  let cleanTicker = ticker.trim().toUpperCase();
  if (!cleanTicker.endsWith(".NS")) {
    cleanTicker = `${cleanTicker}.NS`;
  }
  return cleanTicker;
}

// ── Error handling ─────────────────────────────────────────────────────────────

interface BackendErrorDetail {
  error?: string;
  message?: string;
}

export class AnalysisError extends Error {
  title: string;

  constructor({ title, message }: { title: string; message: string }) {
    super(message);
    this.name = "AnalysisError";
    this.title = title;
  }
}

/**
 * Map backend structured error responses to user-friendly messages.
 *
 * Backend error codes:
 *   401 → { error: "invalid_api_key" }
 *   429 → { error: "app_rate_limit" } or { error: "llm_rate_limit" }
 *   404 → { error: "ticker_not_found" }
 *   Everything else → 500 internal server error
 */
function buildErrorMessage(
  status: number,
  detail: BackendErrorDetail,
): { title: string; message: string } {
  const errorCode = detail?.error ?? "";
  const serverMsg = detail?.message ?? "";

  // 401 — Invalid API key
  if (status === 401 && errorCode !== "invalid_api_key") {
    return {
      title: "SIGN IN REQUIRED",
      message: "Your session has expired. Please sign in again.",
    };
  }

  // 401 — Invalid API key
  if (status === 401 || errorCode === "invalid_api_key") {
    return {
      title: "INVALID API KEY",
      message:
        "We couldn't authenticate your request. The Groq API key provided appears to be invalid, expired, or improperly formatted.",
    };
  }

  // 429 — Rate limits
  if (status === 429) {
    if (errorCode === "app_rate_limit") {
      return {
        title: "TOO MANY REQUESTS",
        message:
          "You've exceeded the maximum number of analysis requests allowed per minute.",
      };
    }
    if (errorCode === "llm_rate_limit") {
      return {
        title: "LLM RATE LIMIT HIT",
        message:
          "The Groq AI model has temporarily throttled your requests. Free-tier API keys have a limited number of tokens and requests per minute.",
      };
    }
    return {
      title: "RATE LIMIT REACHED",
      message:
        "Too many requests in a short period. The service needs a moment to recover.",
    };
  }

  // 403 — Guest limit reached
  if (status === 403 || errorCode === "limit_reached") {
    return {
      title: "GUEST LIMIT REACHED",
      message: "You have reached the limit of 3 free guest searches. Please sign up or log in to search more.",
    };
  }

  // 404 — Ticker not found
  if (status === 404) {
    return {
      title: "TICKER NOT FOUND",
      message:
        "The ticker symbol you entered wasn't found on the National Stock Exchange (NSE). It may be delisted, misspelled, or not yet listed.",
    };
  }

  // Everything else → internal server error
  return {
    title: "SOMETHING WENT WRONG",
    message:
      "The analysis server encountered an unexpected error while processing your request. This is usually a temporary issue on our end.",
  };
}

// ── Main analysis function ─────────────────────────────────────────────────────

export async function analyseTicker({
  ticker,
  groqApiKey,
  authToken,
  signal,
}: {
  ticker: string;
  groqApiKey: string;
  authToken?: string;
  signal?: AbortSignal;
}): Promise<AnalyseResponse> {
  const cleanTicker = normalizeTicker(ticker);
  const url = `${API_BASE_URL}/analyze`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (groqApiKey) {
    headers["Groq-API-Key"] = groqApiKey.trim();
  }

  if (typeof window !== "undefined") {
    const orKey = localStorage.getItem("openrouter_api_key");
    if (orKey) {
      headers["OpenRouter-API-Key"] = orKey.trim();
    }
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ticker: cleanTicker }),
      signal,
    });
  } catch (fetchErr) {
    if (signal?.aborted) throw fetchErr;
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message:
        "Unable to reach the authentication server.",
    });
  }

  const rawData = await res.json();

  if (!res.ok) {
    const detail = rawData?.detail ?? rawData ?? {};
    throw new AnalysisError(buildErrorMessage(res.status, detail));
  }

  // Inject fallback dummy values if they are missing from the backend response
  const data: AnalyseResponse = {
    ticker: rawData.ticker ?? cleanTicker,
    news_report: rawData.news_report || "No news report available.",
    technical_report: rawData.technical_report || "No technical report available.",
    fundamental_report: rawData.fundamental_report || "No fundamental report available.",
    market_report: rawData.market_report || "No market report available.",
    sector_report: rawData.sector_report || "No sector report available.",
    status: rawData.status || "success",
    company_info: rawData.company_info || null,
    fundamental_data: rawData.fundamental_data || null,
    technical_data: rawData.technical_data || null,
    market_data: rawData.market_data || null,
    company_news: rawData.company_news || null,
    indian_news: rawData.indian_news || null,
    global_news: rawData.global_news || null,
    historical_prices: rawData.historical_prices || [],
    charts_data: rawData.charts_data,
  };

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function saveAuthSession(session: AuthResponse) {
  const expires = new Date();
  expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
  document.cookie = `${AUTH_TOKEN_KEY}=${session.token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function clearAuthSession() {
  document.cookie = `${AUTH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthToken() {
  if (typeof document === "undefined") return "";
  const nameEQ = `${AUTH_TOKEN_KEY}=`;
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return "";
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getSavedGroqApiKey(): string {
  if (typeof window === "undefined") return "";
  const user = getAuthUser();
  if (!user) {
    try {
      return localStorage.getItem("groq_api_key_guest") || "";
    } catch {
      return "";
    }
  }
  try {
    return localStorage.getItem(`groq_api_key_${user.email}`) || "";
  } catch {
    return "";
  }
}

export function saveGroqApiKey(key: string) {
  if (typeof window === "undefined") return;
  const user = getAuthUser();
  const trimmed = key.trim();
  if (!user) {
    try {
      if (!trimmed) {
        localStorage.removeItem("groq_api_key_guest");
      } else {
        localStorage.setItem("groq_api_key_guest", trimmed);
      }
    } catch {}
    return;
  }
  try {
    if (!trimmed) {
      localStorage.removeItem(`groq_api_key_${user.email}`);
    } else {
      localStorage.setItem(`groq_api_key_${user.email}`, trimmed);
    }
  } catch {}
}

export async function authRequest({
  mode,
  email,
  password,
  name,
}: {
  mode: "login" | "signup";
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server.",
    });
  }

  if (!res.ok) {
    let detail: BackendErrorDetail = {};
    try {
      const errorBody = await res.json();
      detail = errorBody?.detail ?? errorBody ?? {};
    } catch {}
    throw new AnalysisError({
      title: res.status === 409 ? "ACCOUNT EXISTS" : "AUTHENTICATION FAILED",
      message:
        detail.message ||
        "Please check your email and password, then try again.",
    });
  }

  return res.json();
}

export async function authenticateWithGoogle(credentialToken: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential_token: credentialToken }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server.",
    });
  }

  const rawData = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = rawData?.detail ?? rawData ?? {};
    throw new AnalysisError({
      title: "AUTHENTICATION FAILED",
      message: detail.message || "Google authentication failed.",
    });
  }

  return rawData as AuthResponse;
}

export async function changePassword({
  currentPassword,
  newPassword,
  authToken,
}: {
  currentPassword: string;
  newPassword: string;
  authToken: string;
}): Promise<{ status: string; message: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server.",
    });
  }

  if (!res.ok) {
    let detail: BackendErrorDetail = {};
    try {
      const errorBody = await res.json();
      detail = errorBody?.detail ?? errorBody ?? {};
    } catch {}
    throw new AnalysisError({
      title: "PASSWORD CHANGE FAILED",
      message: detail.message || "Failed to change password. Please check your credentials.",
    });
  }

  return res.json();
}

export async function verifyGroqApiKey({
  groqApiKey,
  authToken,
}: {
  groqApiKey: string;
  authToken?: string;
}): Promise<{ valid: boolean }> {
  let res: Response;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  try {
    res = await fetch(`${API_BASE_URL}/auth/verify-groq-key`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        groq_api_key: groqApiKey,
      }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server.",
    });
  }

  if (!res.ok) {
    let detail: BackendErrorDetail = {};
    try {
      const errorBody = await res.json();
      detail = errorBody?.detail ?? errorBody ?? {};
    } catch {}
    throw new AnalysisError({
      title: "KEY VALIDATION FAILED",
      message: detail.message || "Failed to verify the Groq API key.",
    });
  }

  return res.json();
}

// ── Session cache ──────────────────────────────────────────────────────────────

const KEY = (t: string) => `arbor:research:${t.toUpperCase()}`;

export function cacheResponse(ticker: string, data: AnalyseResponse) {
  try {
    const clean = normalizeTicker(ticker);
    sessionStorage.setItem(KEY(clean), JSON.stringify(data));
  } catch {}
}

export function clearCached(ticker: string) {
  try {
    sessionStorage.removeItem(KEY(normalizeTicker(ticker)));
  } catch {}
}

export function readCached(ticker: string): AnalyseResponse | null {
  try {
    const clean = normalizeTicker(ticker);
    const raw = sessionStorage.getItem(KEY(clean));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalyseResponse;
    if (!parsed.charts_data) {
      sessionStorage.removeItem(KEY(clean));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
