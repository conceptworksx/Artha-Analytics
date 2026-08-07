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
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisSummary,
    AnalysisDetail,
)
from api.dependencies import (
    get_auth_service,
    get_analysis_service,
    get_current_user,
    get_current_user_optional,
)
from services.auth_service import AuthService
from services.analysis_service import AnalysisService
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
from core.exceptions import SearchLimitReachedError
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


@router.post("/auth/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(
    request: Request,
    body: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    token, user_doc = await auth_service.signup_user(
        body.email, body.password, body.name
    )
    user = AuthUser(
        id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
    )
    return AuthResponse(token=token, user=user)


@router.post("/auth/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    token, user_doc = await auth_service.login_user(body.email, body.password)
    user = AuthUser(
        id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
    )
    return AuthResponse(token=token, user=user)


@router.post("/auth/google", response_model=AuthResponse)
@limiter.limit("5/minute")
async def google_auth(
    request: Request,
    body: GoogleAuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    token, user_doc = await auth_service.authenticate_google_user(body.credential_token)
    user = AuthUser(
        id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
    )
    return AuthResponse(token=token, user=user)


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


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("3/minute")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    openrouter_api_key: Optional[str] = Header(None, alias="OpenRouter-API-Key"),
    user: Optional[AuthUser] = Depends(get_current_user_optional),
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    ticker = body.ticker.strip().upper()
    logger.info(f"Analyze request received | ticker={ticker}")

    client_ip = get_client_ip(request)

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

        if user is not None:
            from datetime import datetime, timezone

            doc = {
                "analyzed_at": datetime.now(timezone.utc),
                "status": "success",
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
                "market_analyst_report": final_state.get("market_analyst_report", {}),
                "market_analyst_summary": final_state.get("market_analyst_summary", {}),
                "sector_analyst_report": final_state.get("sector_analyst_report", {}),
                "sector_analyst_summary": final_state.get("sector_analyst_summary", {}),
                "company_info": data_bundle.get("company_info"),
                "historical_prices": data_bundle.get("historical_prices"),
                "charts_data": final_state.get("charts_data"),
                "fundamental_data": data_bundle.get("fundamental_data"),
                "technical_data": data_bundle.get("technical_data"),
                "market_data": data_bundle.get("market_data"),
                "company_news": data_bundle.get("news_data", {}).get("company_news"),
                "indian_news": data_bundle.get("news_data", {}).get("indian_news"),
                "global_news": data_bundle.get("news_data", {}).get("global_news"),
                "verdict": final_state.get("verdict"),
                "bull_thesis": final_state.get("investment_debate", {}).get(
                    "bull_thesis"
                ),
                "bear_thesis": final_state.get("investment_debate", {}).get(
                    "bear_thesis"
                ),
                "debate_transcript": final_state.get("investment_debate", {}).get(
                    "debate_history"
                ),
            }

            analysis_id = await analysis_service.save_analysis(user.id, ticker, doc)
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
            verdict=final_state.get("verdict"),
            bull_thesis=final_state.get("investment_debate", {}).get("bull_thesis"),
            bear_thesis=final_state.get("investment_debate", {}).get("bear_thesis"),
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
            detail={"error": error_code, "message": e.message},
        )
    except Exception as e:
        logger.exception(
            f"Unexpected error occurred in /analyze endpoint | ticker={ticker} | error={e}"
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "unexpected_error",
                "message": "An unexpected error occurred",
            },
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
                analysis_id=str(doc["_id"]),
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
        analysis_id=str(doc["_id"]),
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
