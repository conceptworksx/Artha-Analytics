import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Request, Header, HTTPException

from api.models import (
    TickerItem,
    AnalyzeRequest,
    AnalyzeResponse,
    AuthUser,
)
from api.dependencies import (
    get_analysis_service,
    get_cache_service,
    get_current_user_optional,
)
from services.analysis_service import AnalysisService
from services.cache_service import CacheService
from core.exceptions import SearchLimitReachedError
from core.logging import get_logger
from graph.builder import build_graph
from api.utils import (
    limiter,
    get_client_ip,
    resolve_openrouter_key,
    handle_pipeline_error,
)

logger = get_logger(__name__)
router = APIRouter(tags=["Analysis"])


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
    x_openrouter_api_key: Optional[str] = Header(None, alias="X-Openrouter-Api-Key"),
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

    resolved_api_key = resolve_openrouter_key(
        request, openrouter_api_key, x_openrouter_api_key
    )
    analysis_service.validate_api_keys(resolved_api_key)
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
            openrouter_api_key=resolved_api_key, thinking_level=body.thinking_mode
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
            analyst_summaries={
                "market_analyst_summary": final_state.get("market_analyst_summary", {}),
                "fundamental_analyst_summary": final_state.get(
                    "fundamental_analyst_summary", {}
                ),
                "technical_analyst_summary": final_state.get(
                    "technical_analyst_summary", {}
                ),
                "news_analyst_summary": final_state.get("news_analyst_summary", {}),
                "sector_analyst_summary": final_state.get("sector_analyst_summary", {}),
            },
            status="success",
        )

        # Cache response in Redis for 20 minutes (1200s)
        await cache_service.set_json(cache_key, response.model_dump(), ttl_seconds=1200)

        return response

    except Exception as e:
        raise handle_pipeline_error(e, ticker=ticker, domain="analysis")
    finally:
        await cache_service.release_lock(lock_key)
