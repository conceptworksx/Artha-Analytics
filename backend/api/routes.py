import asyncio
import os
import jwt
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.models import (
    AuthRequest,
    AuthResponse,
    AuthUser,
    ChangePasswordRequest,
    GoogleAuthRequest,
    VerifyGroqKeyRequest,
    AnalyzeRequest,
    AnalyzeResponse,
)
from api.controllers import (
    signup_user,
    login_user,
    change_password_user,
    authenticate_google_user,
    validate_api_keys,
    validate_ticker_format,
    validate_ticker_exists,
    _get_user_by_id,
    _secret_key,
)
from core.error import (
    AgentError,
    AuthenticationError,
    LLMRateLimitError,
    TokenLimitError,
    ModelUnavailableError,
    MaxRetriesExceeded,
    NodeExecutionError,
    DataFetchError,
    ToolCallError,
)
from core.logging import get_logger
from graph.builder import build_graph

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ── Error map ───────────────────────────────────────────────────────────────────
_ERROR_MAP: dict[type, tuple[int, str]] = {
    AuthenticationError: (401, "invalid_groq_api_key"),
    LLMRateLimitError: (429, "llm_rate_limit"),
    TokenLimitError: (422, "token_limit_exceeded"),
    ModelUnavailableError: (503, "llm_unavailable"),
    MaxRetriesExceeded: (503, "max_retries_exceeded"),
    DataFetchError: (422, "data_fetch_failed"),
    ToolCallError: (500, "tool_call_failed"),
    NodeExecutionError: (500, "node_execution_failed"),
    AgentError: (500, "analysis_failed"),
}


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={"error": "auth_required", "message": "Sign in to continue."},
        )

    token = credentials.credentials
    try:
        claims = jwt.decode(
            token,
            _secret_key(),
            algorithms=["HS256"],
        )
        user_row = _get_user_by_id(claims["sub"])
        if not user_row:
            raise ValueError("missing user")
        return AuthUser(
            id=str(user_row["_id"]),
            email=user_row["email"],
            name=user_row.get("name"),
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_token", "message": "Session expired."},
        )


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.post("/auth/signup", response_model=AuthResponse)
def signup(body: AuthRequest):
    return signup_user(body)


@router.post("/auth/login", response_model=AuthResponse)
def login(body: AuthRequest):
    return login_user(body)


@router.post("/auth/google", response_model=AuthResponse)
def google_auth(body: GoogleAuthRequest):
    return authenticate_google_user(body)


@router.get("/auth/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)):
    return user


@router.post("/auth/change-password")
def change_password(
    body: ChangePasswordRequest,
    user: AuthUser = Depends(get_current_user),
):
    change_password_user(user, body)
    return {"status": "success", "message": "Password updated successfully."}


@router.post("/auth/verify-groq-key")
def verify_groq_key(
    body: VerifyGroqKeyRequest,
):
    is_valid, err_msg = validate_api_keys(groq_api_key=body.groq_api_key)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_groq_api_key",
                "message": err_msg or "The Groq API key is invalid.",
            },
        )
    return {"valid": True}


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("3/minute")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    groq_api_key: Optional[str] = Header(None, alias="Groq-API-Key"),
    user: AuthUser = Depends(get_current_user),
):
    ticker = body.ticker.strip().upper()
    logger.info(f"Analyze request received | ticker={ticker}")

    # Ensure Groq API Key is provided
    if (
        not groq_api_key
        or groq_api_key == "undefined"
        or groq_api_key == "null"
        or not groq_api_key.strip()
    ):
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_api_key", "message": "Groq API Key is required."},
        )

    # Validate API key format
    is_valid_key, key_error = validate_api_keys(groq_api_key=groq_api_key)
    if not is_valid_key:
        logger.warning(f"Invalid API key format | ticker={ticker}")
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_api_key", "message": key_error},
        )

    # Validate ticker format
    is_valid_format, format_error = validate_ticker_format(ticker)
    if not is_valid_format:
        logger.warning(f"Invalid ticker format | ticker={ticker}")
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_ticker_format",
                "message": format_error,
            },
        )

    # Validate ticker exists
    is_valid_ticker, ticker_error = validate_ticker_exists(ticker)
    if not is_valid_ticker:
        logger.warning(f"Ticker not found | ticker={ticker}")
        raise HTTPException(
            status_code=404,
            detail={"error": "ticker_not_found", "message": ticker_error},
        )

    # Run LangGraph workflow
    try:
        logger.info(f"Starting graph execution | ticker={ticker}")
        graph = build_graph(groq_api_key=groq_api_key)
        final_state = await asyncio.to_thread(
            graph.invoke, {"ticker_of_company": ticker}
        )
        logger.info(f"Graph execution completed | ticker={ticker}")

        data_bundle = final_state.get("data_bundle", {})
        return AnalyzeResponse(
            ticker=ticker,
            news_report=final_state.get("news_analyst_report", ""),
            technical_report=final_state.get("technical_analyst_report", ""),
            fundamental_report=final_state.get("fundamental_analyst_report", ""),
            market_report=final_state.get("market_analyst_report", ""),
            sector_report=final_state.get("sector_analyst_report", ""),
            company_info=data_bundle.get("company_info"),
            historical_prices=data_bundle.get("historical_prices"),
            charts_data=final_state.get("charts_data"),
            status="success",
        )

    except AgentError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (500, "analysis_failed"),
        )
        logger.error(
            f"Analysis failed | ticker={ticker} | "
            f"error={error_code} | {type(e).__name__}: {e}"
        )
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": error_code,
                "message": e.message,
            },
        )

    except Exception as e:
        logger.exception(f"Unexpected error | ticker={ticker} | error={e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "unexpected_error", "message": str(e)},
        )
