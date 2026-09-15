export interface ThesisArgument {
  heading: string;
  details: string[];
  rebuttal?: string;
}

export interface ThesisOutput {
  title: string;
  introduction: string;
  arguments: ThesisArgument[];
  status: string;
}

export interface Verdict {
  decision: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entry_price: string;
  exit_price: string;
  stop_loss: string;
  hold_duration: string;
  rationale: string;
  strategy: string;
  bull_strength: "strong" | "moderate" | "weak";
  bear_strength: "strong" | "moderate" | "weak";
  key_catalysts: string[];
  key_risks: string[];
  status: "success" | "failure";
}

export interface DebateResponse {
  ticker: string;
  bull_thesis?: ThesisOutput | null;
  bear_thesis?: ThesisOutput | null;
  verdict?: Verdict | null;
  status: string;
}

export interface AnalysisSummary {
  analysis_id: string;
  ticker: string;
  company_name?: string | null;
  analyzed_at: string;
  status: string;
}

export interface Ticker {
  symbol: string;
  name: string;
}


export interface AnalyseResponse {
  ticker: string;
  news_report: any;
  technical_report: any;
  fundamental_report: any;
  market_report: any;
  sector_report: any;
  status: string;
  company_info?: any;
  fundamental_data?: any;
  technical_data?: any;
  market_data?: any;
  company_news?: any;
  indian_news?: any;
  global_news?: any;
  historical_prices?: any[];

  bull_thesis?: ThesisOutput | null;
  bear_thesis?: ThesisOutput | null;
  verdict?: Verdict | null;
  analyst_summaries?: any;

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

// Prioritize the environment variable for production deployments (e.g., Vercel + Heroku).
// Fall back to dynamic hostname for local network development across devices, or localhost.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000"
);

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
function sanitizeUserErrorMessage(msg: string, fallback: string): string {
  if (!msg || typeof msg !== "string") return fallback;
  const lower = msg.toLowerCase();
  if (
    lower.includes("traceback") ||
    lower.includes("exception") ||
    lower.includes("error:") ||
    lower.includes("keyerror") ||
    lower.includes("typeerror") ||
    lower.includes("valueerror") ||
    lower.includes("attributeerror") ||
    lower.includes("pydantic") ||
    lower.includes("schema") ||
    lower.includes("validation error") ||
    lower.includes("yfinance") ||
    lower.includes("connectionpool") ||
    lower.includes("max retries") ||
    lower.includes("errno") ||
    lower.includes("object at 0x") ||
    lower.includes("missing required")
  ) {
    return fallback;
  }
  return msg;
}

function buildErrorMessage(
  status: number,
  detail: BackendErrorDetail,
): { title: string; message: string } {
  const errorCode = detail?.error ?? "";
  const serverMsg = detail?.message ?? "";

  // 401 — Invalid API key / Auth
  if (status === 401 && errorCode !== "invalid_api_key") {
    return {
      title: "SIGN IN REQUIRED",
      message: "Your session has expired. Please sign in again to continue.",
    };
  }

  if (status === 401 || errorCode === "invalid_api_key") {
    return {
      title: "INVALID API KEY",
      message:
        "We couldn't authenticate your request. The OpenRouter API key provided appears to be invalid or expired. Please check your key in settings.",
    };
  }

  // 429 — Rate limits
  if (status === 429) {
    if (errorCode === "app_rate_limit") {
      return {
        title: "TOO MANY REQUESTS",
        message:
          "You've exceeded the request limit. Please wait a minute before making another request.",
      };
    }
    if (errorCode === "llm_rate_limit") {
      return {
        title: "AI SERVICE BUSY",
        message:
          "The AI analysis engine is currently experiencing high traffic. Please wait a minute before retrying.",
      };
    }
    return {
      title: "RATE LIMIT REACHED",
      message:
        "Too many requests in a short period. Please give the service a moment to recover before trying again.",
    };
  }

  // 403 — Guest limit reached
  if (status === 403 || errorCode === "limit_reached") {
    return {
      title: "GUEST LIMIT REACHED",
      message:
        "You have reached the limit of 3 free guest searches. Please sign in or create a free account to continue researching.",
    };
  }

  // 404 — Ticker not found
  if (status === 404) {
    return {
      title: "TICKER NOT FOUND",
      message:
        "The stock symbol you entered was not found on the National Stock Exchange (NSE). It may be delisted, misspelled, or not yet listed.",
    };
  }

  // 400 — Validation & prerequisite errors
  if (status === 400) {
    if (errorCode === "missing_api_key") {
      return {
        title: "API KEY REQUIRED",
        message:
          "An OpenRouter API key is required to perform AI analysis. Please configure your key in settings.",
      };
    }
    if (errorCode === "missing_analysis") {
      return {
        title: "ANALYSIS REQUIRED",
        message:
          "No prior analyst reports were found for this stock. Please run the 5-analyst analysis first before triggering the debate.",
      };
    }
    if (errorCode === "invalid_analysts") {
      return {
        title: "ANALYST DATA INCOMPLETE",
        message:
          "Some analyst reports are missing or incomplete. Please re-run the 5-analyst analysis for this stock to generate complete data before starting the debate.",
      };
    }
    return {
      title: "INVALID REQUEST",
      message: sanitizeUserErrorMessage(
        serverMsg,
        "The requested operation could not be processed. Please try again.",
      ),
    };
  }

  // 422 — Data fetch or processing limits
  if (status === 422) {
    if (errorCode === "data_fetch_failed") {
      return {
        title: "MARKET DATA UNAVAILABLE",
        message:
          "Real-time market data for this stock could not be retrieved from the exchange right now. Please verify that the stock is actively traded or try again in a few moments.",
      };
    }
    if (errorCode === "token_limit_exceeded") {
      return {
        title: "REPORT TOO EXTENSIVE",
        message:
          "The data volume for this stock exceeded the AI model capacity. Please try re-running with Low thinking mode.",
      };
    }
  }

  // 502 / 503 / 504 — Service availability
  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    errorCode === "llm_unavailable" ||
    errorCode === "max_retries_exceeded"
  ) {
    return {
      title: "AI SERVICE TEMPORARILY OVERLOADED",
      message:
        "The AI model servers are currently busy or taking longer than usual to respond. Please click Retry in a few moments.",
    };
  }

  // Everything else → internal server error / analysis failure
  return {
    title: "ANALYSIS TEMPORARILY UNAVAILABLE",
    message: sanitizeUserErrorMessage(
      serverMsg,
      "Our AI analysis engine encountered a temporary issue while compiling report data. Please click Retry or try again in a moment.",
    ),
  };
}



// ── Main analysis function ─────────────────────────────────────────────────────

export async function analyseTicker({
  ticker,
  openrouterApiKey,
  authToken,
  signal,
  include_debate = false,
  thinking_mode = "low",
}: {
  ticker: string;
  openrouterApiKey: string;
  authToken?: string;
  signal?: AbortSignal;
  include_debate?: boolean;
  thinking_mode?: "low" | "medium" | "high";
}): Promise<AnalyseResponse> {
  const cleanTicker = normalizeTicker(ticker);
  const url = `${API_BASE_URL}/analyze`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (openrouterApiKey) {
    headers["OpenRouter-API-Key"] = openrouterApiKey.trim();
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetchWithAuth(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ticker: cleanTicker, include_debate, thinking_mode }),
      signal,
    });
  } catch (fetchErr) {
    if (signal?.aborted) throw fetchErr;
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message:
        "Unable to reach the analysis server. Please check your internet connection and verify that the backend server is running.",
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
    bull_thesis: rawData.bull_thesis || null,
    bear_thesis: rawData.bear_thesis || null,
    verdict: rawData.verdict || null,
    analyst_summaries: rawData.analyst_summaries || null,
    charts_data: rawData.charts_data,
  };

  return data;
}

export async function runDebate({
  ticker,
  openrouterApiKey,
  authToken,
  signal,
  thinking_mode = "low",
  analysisData,
}: {
  ticker: string;
  openrouterApiKey?: string;
  authToken?: string;
  signal?: AbortSignal;
  thinking_mode?: "low" | "medium" | "high";
  analysisData?: Partial<AnalyseResponse>;
}): Promise<DebateResponse> {
  const cleanTicker = normalizeTicker(ticker);
  const url = `${API_BASE_URL}/debate`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const key = openrouterApiKey || getSavedOpenRouterApiKey();
  if (key) {
    headers["OpenRouter-API-Key"] = key.trim();
    headers["X-Openrouter-Api-Key"] = key.trim();
  }

  const token = authToken || getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body: Record<string, any> = {
    ticker: cleanTicker,
    thinking_mode,
  };

  if (analysisData) {
    if (analysisData.analyst_summaries) {
      body.analyst_summaries = analysisData.analyst_summaries;
    }
    if (analysisData.news_report) body.news_report = analysisData.news_report;
    if (analysisData.technical_report) body.technical_report = analysisData.technical_report;
    if (analysisData.fundamental_report) body.fundamental_report = analysisData.fundamental_report;
    if (analysisData.market_report) body.market_report = analysisData.market_report;
    if (analysisData.sector_report) body.sector_report = analysisData.sector_report;
  }

  let res: Response;
  try {
    res = await fetchWithAuth(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (fetchErr) {
    if (signal?.aborted) throw fetchErr;
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the debate server. Please check your connection.",
    });
  }

  const rawData = await res.json();
  if (!res.ok) {
    const detail = rawData?.detail ?? rawData ?? {};
    throw new AnalysisError(buildErrorMessage(res.status, detail));
  }

  return {
    ticker: rawData.ticker ?? cleanTicker,
    bull_thesis: rawData.bull_thesis || null,
    bear_thesis: rawData.bear_thesis || null,
    verdict: rawData.verdict || null,
    status: rawData.status || "success",
  };
}

const HISTORY_CACHE_KEY = "arbor:past_analysis_history";
const HISTORY_DETAIL_KEY = (id: string) => `arbor:history_detail:${id}`;

export function readCachedHistory(): AnalysisSummary[] | null {
  try {
    const raw = sessionStorage.getItem(HISTORY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AnalysisSummary[];
  } catch {
    return null;
  }
}

export function cacheHistory(data: AnalysisSummary[]) {
  try {
    sessionStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(data));
  } catch { }
}

export function clearHistoryCache() {
  try {
    sessionStorage.removeItem(HISTORY_CACHE_KEY);
  } catch { }
}

export async function getAnalysisHistory(
  authToken: string,
  bypassCache: boolean = false
): Promise<AnalysisSummary[]> {

  if (!bypassCache) {
    const cached = readCachedHistory();
    if (cached) return cached;
  }

  const url = `${API_BASE_URL}/analyses/history`;
  const res = await fetchWithAuth(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch analysis history");
  }

  const data: AnalysisSummary[] = await res.json();
  cacheHistory(data);
  return data;
}

export async function getTickers(): Promise<Ticker[]> {
  const url = `${API_BASE_URL}/tickers`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch tickers from API");
  }

  return res.json();
}

export interface SaveAnalysisResponse {
  status: string;
  analysis_id: string;
  message: string;
}

export async function saveAnalysis({
  data,
  authToken,
}: {
  data: AnalyseResponse;
  authToken: string;
}): Promise<SaveAnalysisResponse> {
  const url = `${API_BASE_URL}/analyses/save`;
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let detail: BackendErrorDetail = {};
    try {
      const err = await res.json();
      detail = err.detail || err || {};
    } catch { }
    throw new AnalysisError({
      title: "SAVE FAILED",
      message: detail.message || "Failed to save analysis to history.",
    });
  }

  const result: SaveAnalysisResponse = await res.json();
  markAnalysisSaved(data.ticker);
  clearHistoryCache();
  return result;
}

export function isAnalysisSaved(ticker: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(`saved_analysis_${normalizeTicker(ticker)}`);
    return !!saved;
  } catch {
    return false;
  }
}

export function markAnalysisSaved(ticker: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`saved_analysis_${normalizeTicker(ticker)}`, "true");
  } catch { }
}



export async function getAnalysisById(
  analysisId: string,
  authToken: string
): Promise<AnalyseResponse> {
  try {
    const raw = sessionStorage.getItem(HISTORY_DETAIL_KEY(analysisId));
    if (raw) {
      return JSON.parse(raw) as AnalyseResponse;
    }
  } catch { }

  const url = `${API_BASE_URL}/analyses/${analysisId}`;
  const res = await fetchWithAuth(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });


  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Analysis not found");
    }
    throw new Error("Failed to fetch analysis");
  }

  const rawData = await res.json();

  // Similar mapping to analyseTicker
  const data: AnalyseResponse = {
    ticker: rawData.ticker,
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
    bull_thesis: rawData.bull_thesis || null,
    bear_thesis: rawData.bear_thesis || null,
    verdict: rawData.verdict || null,
    charts_data: rawData.charts_data,
  };

  try {
    sessionStorage.setItem(HISTORY_DETAIL_KEY(analysisId), JSON.stringify(data));
  } catch { }

  return data;
}

// ── Auth & Interceptor ────────────────────────────────────────────────────────

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: "include",
  };

  const headers = new Headers(options.headers || {});
  const currentToken = getAuthToken();
  if (currentToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${currentToken}`);
  }
  options.headers = headers;

  const res = await fetch(input, options);

  if (res.status === 401) {
    const clone = res.clone();
    try {
      const body = await clone.json();
      const errorCode = body?.detail?.error || body?.error;
      if (errorCode !== "invalid_api_key") {
        clearAuthSession(false);
      }
    } catch {
      clearAuthSession(false);
    }
  }

  return res;
}

export function saveAuthSession(session: AuthResponse) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, session.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    } catch { }
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `${AUTH_TOKEN_KEY}=${session.token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    } catch { }
  }
}

export function clearAuthSession(callLogoutApi: boolean = true) {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch { }
    try {
      document.cookie = `${AUTH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    } catch { }
    if (callLogoutApi) {
      try {
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      } catch { }
    }
  }
}

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && token.trim()) return token.trim();
  } catch { }

  try {
    const nameEQ = `${AUTH_TOKEN_KEY}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
  } catch { }

  return "";
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const token = getAuthToken();
  if (!token) return null;

  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}


export function getSavedOpenRouterApiKey(): string | null {
  if (typeof window === "undefined") return null;
  const user = getAuthUser();
  if (!user) {
    try {
      return localStorage.getItem("openrouter_api_key_guest") || "";
    } catch {
      return "";
    }
  }
  try {
    return localStorage.getItem(`openrouter_api_key_${user.email}`) || "";
  } catch {
    return "";
  }
}

export function saveOpenRouterApiKey(key: string) {
  if (typeof window === "undefined") return;
  const user = getAuthUser();
  const trimmed = key.trim();
  if (!user) {
    try {
      if (!trimmed) {
        localStorage.removeItem("openrouter_api_key_guest");
      } else {
        localStorage.setItem("openrouter_api_key_guest", trimmed);
      }
    } catch { }
  } else {
    try {
      if (!trimmed) {
        localStorage.removeItem(`openrouter_api_key_${user.email}`);
      } else {
        localStorage.setItem(`openrouter_api_key_${user.email}`, trimmed);
      }
    } catch { }
  }

  try {
    window.dispatchEvent(new CustomEvent("openrouter-key-changed", { detail: { hasKey: !!trimmed } }));
  } catch { }
}

function formatAuthErrorMessage(res: Response, errorBody: any, defaultMsg: string): string {
  let rawMsg = "";
  let errorCode = "";

  if (typeof errorBody?.detail === "string") {
    rawMsg = errorBody.detail;
  } else if (Array.isArray(errorBody?.detail) && errorBody.detail.length > 0) {
    const firstErr = errorBody.detail[0];
    rawMsg = typeof firstErr === "string"
      ? firstErr
      : (firstErr?.msg ? firstErr.msg.replace(/^Value error,\s*/i, "") : "");
  } else if (typeof errorBody?.detail === "object" && errorBody.detail) {
    rawMsg = errorBody.detail.message || "";
    errorCode = errorBody.detail.error || "";
  } else if (typeof errorBody?.message === "string") {
    rawMsg = errorBody.message;
  }

  if (res.status === 429) {
    if (errorCode === "too_many_otp_attempts") {
      return "Too many failed attempts. This verification code has been invalidated for security. Please request a new code.";
    }
    return "Too many requests in a short time. Please wait a minute before requesting another code.";
  }

  if (res.status === 409 || errorCode === "email_exists") {
    return "An account with this email address already exists. Please switch to the LOGIN tab to sign in.";
  }

  if (res.status === 503 || errorCode === "email_delivery_failed") {
    return "Unable to send verification email right now. Please verify your email address or try again in a few moments.";
  }

  if (res.status === 401 || errorCode === "invalid_credentials") {
    return "Incorrect email or password. Please check your credentials and try again.";
  }

  if (errorCode === "invalid_otp") {
    return "Invalid verification code. Please check the 6-digit code and try again.";
  }

  if (errorCode === "otp_expired") {
    return "This verification code has expired. Please request a new code.";
  }

  if (res.status === 500) {
    return "Authentication server is temporarily busy. Please try again in a moment.";
  }

  return sanitizeUserErrorMessage(rawMsg, defaultMsg);
}

export async function requestRegistrationOTP({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ status: string; message: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server. Please check your internet connection.",
    });
  }

  if (!res.ok) {
    let errorBody: any = {};
    try {
      errorBody = await res.json();
    } catch { }

    const errorMessage = formatAuthErrorMessage(res, errorBody, "Unable to send verification code.");
    throw new AnalysisError({
      title: res.status === 409 ? "ACCOUNT EXISTS" : "REQUEST FAILED",
      message: errorMessage,
    });
  }

  return res.json();
}

export async function verifyRegistrationOTP({
  email,
  otpCode,
}: {
  email: string;
  otpCode: string;
}): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_code: otpCode }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server. Please check your internet connection.",
    });
  }

  if (!res.ok) {
    let errorBody: any = {};
    try {
      errorBody = await res.json();
    } catch { }

    const errorMessage = formatAuthErrorMessage(res, errorBody, "Invalid verification code.");
    throw new AnalysisError({
      title: "VERIFICATION FAILED",
      message: errorMessage,
    });
  }

  return res.json();
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
      credentials: "include",
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server. Please check your internet connection.",
    });
  }

  if (!res.ok) {
    let errorBody: any = {};
    try {
      errorBody = await res.json();
    } catch { }

    const errorMessage = formatAuthErrorMessage(
      res,
      errorBody,
      mode === "signup"
        ? "Failed to create account. Please check your details and try again."
        : "Please check your email and password, then try again."
    );

    throw new AnalysisError({
      title: res.status === 409 ? "ACCOUNT EXISTS" : "AUTHENTICATION FAILED",
      message: errorMessage,
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
      credentials: "include",
      body: JSON.stringify({ credential_token: credentialToken }),
    });
  } catch {
    throw new AnalysisError({
      title: "CONNECTION FAILED",
      message: "Unable to reach the authentication server. Please check your internet connection.",
    });
  }

  const rawData = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMessage = formatAuthErrorMessage(res, rawData, "Google authentication failed.");
    throw new AnalysisError({
      title: "AUTHENTICATION FAILED",
      message: errorMessage,
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
    res = await fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
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
    } catch { }
    throw new AnalysisError({
      title: "PASSWORD CHANGE FAILED",
      message: detail.message || "Failed to change password. Please check your credentials.",
    });
  }

  return res.json();
}

export async function verifyOpenRouterApiKey({
  openrouterApiKey,
  authToken,
}: {
  openrouterApiKey: string;
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
    res = await fetchWithAuth(`${API_BASE_URL}/auth/verify-openrouter-key`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        openrouter_api_key: openrouterApiKey,
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
    } catch { }
    throw new AnalysisError({
      title: "KEY VALIDATION FAILED",
      message: detail.message || "Failed to verify the API key.",
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
  } catch { }
}

export function clearCached(ticker: string) {
  try {
    sessionStorage.removeItem(KEY(normalizeTicker(ticker)));
  } catch { }
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
