import os
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Request, Header, Response, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address


from api.models import (
    AuthRequest,
    AuthResponse,
    AuthUser,
    ChangePasswordRequest,
    GoogleAuthRequest,
    VerifyOpenRouterKeyRequest,
    RequestOTPRequest,
    VerifyOTPRequest,
    RequestOTPResponse,
    TickerItem,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisSummary,
    AnalysisDetail,
    SaveAnalysisRequest,
    SaveAnalysisResponse,
)


from api.dependencies import (
    get_auth_service,
    get_analysis_service,
    get_cache_service,
    get_current_user,
    get_current_user_optional,
    get_user_repository,
)
from repositories.user_repository import UserRepository
from services.auth_service import AuthService
from services.analysis_service import AnalysisService
from services.cache_service import CacheService
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
from core.exceptions import (
    DomainError,
    SearchLimitReachedError,
    InvalidTokenError,
    InvalidOTPError,
    OTPExpiredError,
    TooManyOTPAttemptsError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    EmailDeliveryError,
)
from core.logging import get_logger
from core.database import get_db
from graph.builder import build_graph
from datetime import timezone

logger = get_logger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

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
    InvalidOTPError: (400, "invalid_otp"),
    OTPExpiredError: (400, "otp_expired"),
    TooManyOTPAttemptsError: (429, "too_many_otp_attempts"),
    UserAlreadyExistsError: (409, "email_exists"),
    InvalidCredentialsError: (401, "invalid_credentials"),
    EmailDeliveryError: (503, "email_delivery_failed"),
}


def get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


@router.get("/health")
async def health_check():
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=503, detail={"status": "unhealthy", "database": "disconnected"}
        )


@router.head("/health")
def health_check_head():
    return Response(status_code=200)


@router.post("/auth/request-otp", response_model=RequestOTPResponse)
@limiter.limit("3/minute")
async def request_otp(
    request: Request,
    body: RequestOTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
    cache_service: CacheService = Depends(get_cache_service),
):
    email_clean = body.email.lower().strip()
    if cache_service.is_enabled:
        otp_key = f"ratelimit:otp:{email_clean}"
        otp_count = await cache_service.incr_counter(otp_key, ttl_seconds=600)
        if otp_count > 3:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "too_many_otp_requests",
                    "message": "Too many OTP requests for this email. Please wait 10 minutes before requesting again.",
                },
            )

    try:
        res = await auth_service.request_registration_otp(
            body.email, body.password, body.name
        )
        return RequestOTPResponse(status=res["status"], message=res["message"])
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (400, "otp_request_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/auth/verify-otp", response_model=AuthResponse)
@limiter.limit("5/minute")
async def verify_otp(
    request: Request,
    body: VerifyOTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        token, user_doc = await auth_service.verify_otp_and_signup(
            body.email, body.otp_code
        )
        user = AuthUser(
            id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
        )
        return AuthResponse(token=token, user=user)
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (400, "otp_verification_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/auth/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(
    request: Request,
    body: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    raise HTTPException(
        status_code=400,
        detail={
            "error": "otp_required",
            "message": "Email verification is required. Please request a verification code via /auth/request-otp first.",
        },
    )


@router.post("/auth/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        token, user_doc = await auth_service.login_user(body.email, body.password)
        user = AuthUser(
            id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
        )
        return AuthResponse(token=token, user=user)
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (401, "login_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/auth/google", response_model=AuthResponse)
@limiter.limit("5/minute")
async def google_auth(
    request: Request,
    body: GoogleAuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        token, user_doc = await auth_service.authenticate_google_user(
            body.credential_token
        )
        user = AuthUser(
            id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
        )
        return AuthResponse(token=token, user=user)
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (400, "google_auth_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/auth/logout")
async def logout():
    return {"status": "success", "message": "Logged out successfully."}


@router.get("/auth/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)):
    return user


@router.post("/auth/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    user: AuthUser = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.change_password(
        user.id, body.current_password, body.new_password
    )
    return {"status": "success", "message": "Password updated successfully."}


@router.post("/auth/verify-openrouter-key")
def verify_openrouter_key(
    body: VerifyOpenRouterKeyRequest,
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    analysis_service.validate_api_keys(body.openrouter_api_key)
    return {"valid": True}


@router.get("/tickers", response_model=list[TickerItem])
async def get_tickers(
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    return await analysis_service.get_nse_tickers()


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("3/minute")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    openrouter_api_key: Optional[str] = Header(None, alias="OpenRouter-API-Key"),
    user: Optional[AuthUser] = Depends(get_current_user_optional),
    analysis_service: AnalysisService = Depends(get_analysis_service),
    cache_service: CacheService = Depends(get_cache_service),
):
    ticker = body.ticker.strip().upper()
    logger.info(f"Analyze request received | ticker={ticker}")

    client_ip = get_client_ip(request)

    if cache_service.is_enabled:
        if user is None:
            ip_key = f"ratelimit:ip:{client_ip}"
            ip_count = await cache_service.incr_counter(ip_key, ttl_seconds=3600)
            if ip_count > 3:
                raise SearchLimitReachedError(
                    "You have reached the limit of 3 free searches per hour. Please sign up or log in to search more."
                )
        else:
            user_key = f"ratelimit:user:{user.id}"
            user_count = await cache_service.incr_counter(user_key, ttl_seconds=3600)
            if user_count > 10:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": "Hourly search limit reached (10 searches/hour). Please try again later.",
                    },
                )

    if user is None:
        search_count = await analysis_service.get_ip_search_count(client_ip)
        if search_count >= 3:
            logger.warning(
                f"Guest search limit reached | ip={client_ip} | ticker={ticker}"
            )
            raise SearchLimitReachedError(
                "You have reached the limit of 3 free searches. Please sign up or log in to search more."
            )

    analysis_service.validate_api_keys(openrouter_api_key)
    analysis_service.validate_ticker_format(ticker)
    await analysis_service.validate_ticker_exists(ticker)

    analysis_type = "full" if body.include_debate else "basic"
    cache_key = f"analysis:{ticker}:{analysis_type}"
    lock_key = f"lock:analysis:{ticker}:{analysis_type}"

    # 1. Check Redis Cache
    cached_report = await cache_service.get_json(cache_key)
    if cached_report:
        logger.info(f"Analysis cache HIT | ticker={ticker}")
        if user is None:
            await analysis_service.increment_ip_search(client_ip)
        return AnalyzeResponse(**cached_report)

    # 2. Check Concurrent Lock if another request is running the same analysis (10-minute TTL for long-running graphs)
    lock_acquired = await cache_service.acquire_lock(lock_key, ttl_seconds=600)
    if not lock_acquired:
        logger.info(
            f"Concurrent lock active for ticker={ticker}. Polling cache every 2 mins (max 10 mins)..."
        )
        # Poll every 2 minutes (120s) for up to 5 iterations (10 minutes total) to minimize Upstash HTTP API calls
        for _ in range(5):
            await asyncio.sleep(120)
            cached_report = await cache_service.get_json(cache_key)
            if cached_report:
                logger.info(f"Analysis cache HIT via polling lock | ticker={ticker}")
                if user is None:
                    await analysis_service.increment_ip_search(client_ip)
                return AnalyzeResponse(**cached_report)

    try:
        logger.info(f"Starting graph execution | ticker={ticker}")
        graph = build_graph(
            openrouter_api_key=openrouter_api_key, thinking_level=body.thinking_mode
        )
        final_state = await asyncio.to_thread(
            graph.invoke,
            {
                "ticker_of_company": ticker,
                "include_debate": body.include_debate,
            },
        )
        logger.info(f"Graph execution completed | ticker={ticker}")

        if user is None:
            await analysis_service.increment_ip_search(client_ip)

        data_bundle = final_state.get("data_bundle", {})

        response = AnalyzeResponse(
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
            verdict=final_state.get("verdict"),
            bull_thesis=final_state.get("investment_debate", {}).get("bull_thesis"),
            bear_thesis=final_state.get("investment_debate", {}).get("bear_thesis"),
            status="success",
        )

        # Cache response in Redis for 20 minutes (1200s)
        await cache_service.set_json(cache_key, response.model_dump(), ttl_seconds=1200)

        return response

    except AgentError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (500, "analysis_failed"),
        )
        logger.error(
            f"Analysis failed | ticker={ticker} | "
            f"error={error_code} | {type(e).__name__}: {e}"
        )
        user_message = (
            "Our AI analysis engine encountered a temporary issue while compiling report data. Please try again in a moment."
            if status_code == 500
            else e.message
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": user_message},
        )
    except Exception as e:
        logger.exception(
            f"Unexpected error occurred in /analyze endpoint | ticker={ticker} | error={e}"
        )
        err_str = str(e).lower()
        if (
            "401" in err_str
            or "unauthorized" in err_str
            or "api_key" in err_str
            or "authentication" in err_str
        ):
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "invalid_api_key",
                    "message": "We couldn't authenticate with OpenRouter. Please verify your OpenRouter API Key.",
                },
            )
        elif (
            "429" in err_str
            or "rate limit" in err_str
            or "quota" in err_str
            or "too many" in err_str
        ):
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "llm_rate_limit",
                    "message": "All free AI models in the pool are currently rate-limited by OpenRouter. Please try again in a minute.",
                },
            )
        elif "503" in err_str or "unavailable" in err_str or "overloaded" in err_str:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "llm_unavailable",
                    "message": "AI model servers are currently overloaded. Please retry in a few seconds.",
                },
            )
        else:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "analysis_failed",
                    "message": "Our AI analysis engine encountered a temporary issue while compiling report data. Please try again in a moment.",
                },
            )
    finally:
        await cache_service.release_lock(lock_key)


@router.post("/analyses/save", response_model=SaveAnalysisResponse)
@limiter.limit("10/minute")
async def save_analysis_route(
    request: Request,
    body: SaveAnalysisRequest,
    user: AuthUser = Depends(get_current_user),
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    from datetime import datetime, timezone

    ticker = body.ticker.strip().upper()
    doc = {
        "analyzed_at": datetime.now(timezone.utc),
        "status": "success",
        "news_analyst_report": body.news_report,
        "technical_analyst_report": body.technical_report,
        "fundamental_analyst_report": body.fundamental_report,
        "market_analyst_report": body.market_report,
        "sector_analyst_report": body.sector_report,
        "company_info": body.company_info,
        "historical_prices": body.historical_prices,
        "charts_data": body.charts_data,
        "fundamental_data": body.fundamental_data,
        "technical_data": body.technical_data,
        "market_data": body.market_data,
        "company_news": body.company_news,
        "indian_news": body.indian_news,
        "global_news": body.global_news,
        "verdict": body.verdict,
        "bull_thesis": body.bull_thesis,
        "bear_thesis": body.bear_thesis,
    }

    analysis_id = await analysis_service.save_analysis(user.id, ticker, doc)
    logger.info(
        f"Analysis explicitly saved | ticker={ticker} | analysis_id={analysis_id} | user_id={user.id}"
    )

    return SaveAnalysisResponse(
        status="success",
        analysis_id=analysis_id,
        message="Analysis saved successfully to Past Analysis.",
    )


@router.get("/analyses/history", response_model=list[AnalysisSummary])
async def list_analyses(
    user: AuthUser = Depends(get_current_user),
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    docs = await analysis_service.get_user_analyses(user.id, limit=5)
    result = []
    from datetime import datetime, timezone

    for doc in docs:
        analyzed_at = doc.get("analyzed_at")
        if isinstance(analyzed_at, (int, float)):
            analyzed_at = datetime.fromtimestamp(analyzed_at, tz=timezone.utc)
        elif analyzed_at and getattr(analyzed_at, "tzinfo", None) is None:
            analyzed_at = analyzed_at.replace(tzinfo=timezone.utc)

        result.append(
            AnalysisSummary(
                analysis_id=str(doc.get("id") or doc.get("_id") or ""),
                ticker=doc.get("ticker", ""),
                company_name=(
                    doc.get("company_info", {}).get("longName")
                    or doc.get("company_info", {}).get("shortName")
                    or doc.get("company_info", {}).get("name")
                    if doc.get("company_info")
                    else None
                ),
                analyzed_at=analyzed_at,
                status=doc.get("status", "success"),
            )
        )
    return result


@router.get("/analyses/{analysis_id}", response_model=AnalysisDetail)
async def get_analysis(
    analysis_id: str,
    user: AuthUser = Depends(get_current_user),
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    doc = await analysis_service.get_analysis_by_id(analysis_id, user.id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": "Analysis not found."},
        )

    from datetime import datetime, timezone

    analyzed_at = doc.get("analyzed_at")
    if isinstance(analyzed_at, (int, float)):
        analyzed_at = datetime.fromtimestamp(analyzed_at, tz=timezone.utc)
    elif analyzed_at and getattr(analyzed_at, "tzinfo", None) is None:
        analyzed_at = analyzed_at.replace(tzinfo=timezone.utc)

    return AnalysisDetail(
        analysis_id=str(doc.get("_id") or doc.get("id") or ""),
        user_id=doc["user_id"],
        analyzed_at=analyzed_at,
        ticker=doc["ticker"],
        status=doc.get("status", "success"),
        news_report=doc.get("news_analyst_report"),
        technical_report=doc.get("technical_analyst_report"),
        fundamental_report=doc.get("fundamental_analyst_report"),
        market_report=doc.get("market_analyst_report"),
        sector_report=doc.get("sector_analyst_report"),
        company_info=doc.get("company_info"),
        historical_prices=doc.get("historical_prices"),
        charts_data=doc.get("charts_data"),
        fundamental_data=doc.get("fundamental_data"),
        technical_data=doc.get("technical_data"),
        market_data=doc.get("market_data"),
        company_news=doc.get("company_news"),
        indian_news=doc.get("indian_news"),
        global_news=doc.get("global_news"),
        verdict=doc.get("verdict"),
        bull_thesis=doc.get("bull_thesis"),
        bear_thesis=doc.get("bear_thesis"),
    )
