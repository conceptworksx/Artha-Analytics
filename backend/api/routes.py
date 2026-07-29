import asyncio
import os
import jwt
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.models import (
    AuthRequest,
    AuthResponse,
    AuthUser,
    ChangePasswordRequest,
    GoogleAuthRequest,
    VerifyOpenRouterKeyRequest,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisSummary,
)
from api.controllers import (
    save_analysis,
    signup_user,
    login_user,
    change_password_user,
    authenticate_google_user,
    validate_api_keys,
    validate_ticker_format,
    validate_ticker_exists,
    _get_user_by_id,
    _secret_key,
    db,
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
from api.controllers import save_analysis, get_user_analyses, get_analysis_by_id
from core.logging import get_logger
from graph.builder import build_graph

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ── Error map ───────────────────────────────────────────────────────────────────
_ERROR_MAP: dict[type, tuple[int, str]] = {
    AuthenticationError: (401, "invalid_api_key"),
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


def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Optional[AuthUser]:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None

    token = credentials.credentials
    try:
        claims = jwt.decode(
            token,
            _secret_key(),
            algorithms=["HS256"],
        )
        user_row = _get_user_by_id(claims["sub"])
        if not user_row:
            return None
        return AuthUser(
            id=str(user_row["_id"]),
            email=user_row["email"],
            name=user_row.get("name"),
        )
    except Exception:
        return None


def get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


@router.get("/health")
def health_check():
    try:
        db.command("ping")

        return {"status": "healthy", "database": "connected"}

    except Exception:
        raise HTTPException(
            status_code=503, detail={"status": "unhealthy", "database": "disconnected"}
        )


@router.head("/health")
def health_check_head():
    return Response(status_code=200)


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


@router.post("/auth/verify-openrouter-key")
def verify_openrouter_key(
    body: VerifyOpenRouterKeyRequest,
):
    is_valid, err_msg = validate_api_keys(openrouter_api_key=body.openrouter_api_key)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_openrouter_api_key",
                "message": err_msg or "The OpenRouter API key is invalid.",
            },
        )
    return {"valid": True}


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("3/minute")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    openrouter_api_key: Optional[str] = Header(None, alias="OpenRouter-API-Key"),
    user: Optional[AuthUser] = Depends(get_current_user_optional),
):
    ticker = body.ticker.strip().upper()
    logger.info(f"Analyze request received | ticker={ticker}")

    # Check search limits for guest users
    client_ip = get_client_ip(request)
    ip_searches_col = db["ip_searches"]

    if user is None:
        ip_record = ip_searches_col.find_one({"ip": client_ip})
        search_count = ip_record.get("count", 0) if ip_record else 0
        if search_count >= 3:
            logger.warning(
                f"Guest search limit reached | ip={client_ip} | ticker={ticker}"
            )
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_reached",
                    "message": "You have reached the limit of 3 free searches. Please sign up or log in to search more.",
                },
            )

    # Ensure OpenRouter API Key is provided
    if (
        not openrouter_api_key
        or openrouter_api_key == "undefined"
        or openrouter_api_key == "null"
        or not openrouter_api_key.strip()
    ):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_api_key",
                "message": "OpenRouter API Key is required.",
            },
        )

    # Validate API key format
    is_valid_key, key_error = validate_api_keys(openrouter_api_key=openrouter_api_key)
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
        graph = build_graph(openrouter_api_key=openrouter_api_key)
        final_state = await asyncio.to_thread(
            graph.invoke, {"ticker_of_company": ticker}
        )
        logger.info(f"Graph execution completed | ticker={ticker}")

        # Increment IP search count for guest users upon successful analysis
        if user is None:
            ip_searches_col.update_one(
                {"ip": client_ip}, {"$inc": {"count": 1}}, upsert=True
            )

        data_bundle = final_state.get("data_bundle", {})

        analysis_id = None
        if user is not None:
            analysis_id = save_analysis(
                user_id=user.id,
                ticker=ticker,
                result={
                    "news_analyst_report": final_state.get("news_analyst_report", {}),
                    "news_analyst_summary": final_state.get("news_analyst_summary", {}),
                    "technical_analyst_report": final_state.get(
                        "technical_analyst_report", {}
                    ),
                    "technical_analyst_summary": final_state.get(
                        "technical_analyst_summary", {}
                    ),
                    "fundamental_analyst_report": final_state.get(
                        "fundamental_analyst_report", {}
                    ),
                    "fundamental_analyst_summary": final_state.get(
                        "fundamental_analyst_summary", {}
                    ),
                    "market_analyst_report": final_state.get(
                        "market_analyst_report", {}
                    ),
                    "market_analyst_summary": final_state.get(
                        "market_analyst_summary", {}
                    ),
                    "sector_analyst_report": final_state.get(
                        "sector_analyst_report", {}
                    ),
                    "sector_analyst_summary": final_state.get(
                        "sector_analyst_summary", {}
                    ),
                    "company_info": data_bundle.get("company_info"),
                    "historical_prices": data_bundle.get("historical_prices"),
                    "charts_data": final_state.get("charts_data"),
                    "fundamental_data": data_bundle.get("fundamental_data"),
                    "technical_data": data_bundle.get("technical_data"),
                    "market_data": data_bundle.get("market_data"),
                    "company_news": data_bundle.get("news_data", {}).get(
                        "company_news"
                    ),
                    "indian_news": data_bundle.get("news_data", {}).get("indian_news"),
                    "global_news": data_bundle.get("news_data", {}).get("global_news"),
                },
            )
            logger.info(f"Analysis saved | ticker={ticker} | analysis_id={analysis_id}")

        return AnalyzeResponse(
            ticker=ticker,
            news_report=final_state.get("news_analyst_report", {}),
            technical_report=final_state.get("technical_analyst_report", {}),
            fundamental_report=final_state.get("fundamental_analyst_report", {}),
            market_report=final_state.get("market_analyst_report", {}),
            sector_report=final_state.get("sector_analyst_report", {}),
            company_info=data_bundle.get("company_info"),
            historical_prices=data_bundle.get("historical_prices"),
            charts_data=final_state.get("charts_data"),
            fundamental_data=data_bundle.get("fundamental_data"),
            technical_data=data_bundle.get("technical_data"),
            market_data=data_bundle.get("market_data"),
            company_news=data_bundle.get("news_data", {}).get("company_news"),
            indian_news=data_bundle.get("news_data", {}).get("indian_news"),
            global_news=data_bundle.get("news_data", {}).get("global_news"),
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


@router.get("/analyses/history", response_model=list[AnalysisSummary])
def list_analyses(user: AuthUser = Depends(get_current_user)):
    """Return last 10 analysis summaries for the logged-in user."""
    docs = get_user_analyses(user.id, limit=10)
    return [
        AnalysisSummary(
            analysis_id=doc["analysis_id"],
            ticker=doc["ticker"],
            company_name=(
                doc.get("company_info", {}).get("name")
                if doc.get("company_info")
                else None
            ),
            analyzed_at=doc["analyzed_at"],
            status=doc.get("status", "success"),
        )
        for doc in docs
    ]


@router.get("/analyses/{analysis_id}")
def get_analysis(
    analysis_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """Fetch a full saved analysis — ownership enforced."""
    doc = get_analysis_by_id(analysis_id, user.id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": "Analysis not found."},
        )
    return doc
