import asyncio
import json
from typing import Optional, Any
from fastapi import APIRouter, Depends, Request, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.models import (
    TickerItem,
    AnalyzeRequest,
    AnalyzeResponse,
    AuthUser,
)
from api.dependencies import (
    get_analysis_service,
    get_cache_service,
    get_stock_data_service,
    get_current_user_optional,
)
from services.analysis_service import AnalysisService
from services.cache_service import CacheService
from services.stock_data_service import StockDataService
from core.exceptions import SearchLimitReachedError
from core.logging import get_logger
from graph.builder import build_graph
from graph.validators import validate_analyst_schemas
from api.utils import (
    limiter,
    get_client_ip,
    resolve_openrouter_key,
    handle_pipeline_error,
)

logger = get_logger(__name__)
router = APIRouter(tags=["Analysis"])


def validate_analysis_for_cache(data: Any) -> tuple[bool, list[str]]:
    """
    Validate that an analysis dictionary or AnalyzeResponse model has all required
    specialist reports and valid market data, AND strictly validates the Pydantic
    schemas of BOTH the individual analyst reports (TechnicalAnalysis, FundamentalAnalysis,
    MarketAnalysis, NewsAnalysis, Sector) and analyst summaries before caching in Redis.
    Prevents cache poisoning from failed, partial, or malformed analysis runs.
    """
    errors: list[str] = []
    if not data:
        return False, ["Analysis data is empty or None"]

    if isinstance(data, dict):
        status = data.get("status")
        company_info = data.get("company_info")
        historical_prices = data.get("historical_prices")
        data_dict = data
    else:
        status = getattr(data, "status", None)
        company_info = getattr(data, "company_info", None)
        historical_prices = getattr(data, "historical_prices", None)
        data_dict = (
            data.model_dump()
            if hasattr(data, "model_dump")
            else getattr(data, "__dict__", {})
        )

    if status not in ("success", None):
        errors.append(f"Analysis status is '{status}'")

    if not company_info or not isinstance(company_info, dict):
        errors.append("company_info is missing or not a dictionary")

    if (
        not historical_prices
        or not isinstance(historical_prices, list)
        or len(historical_prices) == 0
    ):
        errors.append("historical_prices is missing or empty")

    # Strictly validate Pydantic schemas for BOTH the individual specialist reports
    # (MarketAnalysis, FundamentalAnalysis, TechnicalAnalysis, NewsAnalysis, Sector)
    # AND each individual analyst summary (MarketSummary, FundamentalSummary, etc.).
    # If any report or summary violates its schema or is incomplete, reject from cache.
    is_valid_schema, schema_errors = validate_analyst_schemas(
        data_dict, require_full_reports=True
    )
    if not is_valid_schema:
        errors.extend(schema_errors)

    return len(errors) == 0, errors


@router.get("/tickers", response_model=list[TickerItem])
async def get_tickers(
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    return await analysis_service.get_nse_tickers()


@router.post("/analyze", response_model=None)
@limiter.limit("3/minute")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    stream: bool = Query(False),
    openrouter_api_key: Optional[str] = Header(None, alias="OpenRouter-API-Key"),
    x_openrouter_api_key: Optional[str] = Header(None, alias="X-Openrouter-Api-Key"),
    user: Optional[AuthUser] = Depends(get_current_user_optional),
    analysis_service: AnalysisService = Depends(get_analysis_service),
    cache_service: CacheService = Depends(get_cache_service),
    stock_service: StockDataService = Depends(get_stock_data_service),
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

    if stream:

        async def stream_generator():
            # 1. Check Redis Cache
            cached_report = await cache_service.get_json(cache_key)
            if cached_report:
                is_valid, errs = validate_analysis_for_cache(cached_report)
                if is_valid:
                    logger.info(f"Analysis cache HIT (streaming) | ticker={ticker}")
                    yield json.dumps(
                        {
                            "type": "stock_data",
                            "payload": {
                                "ticker": ticker,
                                "company_info": cached_report.get("company_info"),
                                "historical_prices": cached_report.get(
                                    "historical_prices"
                                ),
                                "charts_data": cached_report.get("charts_data"),
                                "technical_data": cached_report.get("technical_data"),
                                "fundamental_data": cached_report.get(
                                    "fundamental_data"
                                ),
                                "market_data": cached_report.get("market_data"),
                            },
                        }
                    ) + "\n"
                    yield json.dumps(
                        {
                            "type": "complete_analysis",
                            "payload": cached_report,
                        }
                    ) + "\n"
                    if user is None:
                        await analysis_service.increment_ip_search(client_ip)
                    return
                else:
                    logger.warning(
                        f"Corrupted analysis found in cache | ticker={ticker} | evicting | errors={errs}"
                    )
                    await cache_service.delete(cache_key)

            # 2. Check Concurrent Lock
            lock_acquired = await cache_service.acquire_lock(lock_key, ttl_seconds=600)
            if not lock_acquired:
                for _ in range(5):
                    await asyncio.sleep(2)
                    cached = await cache_service.get_json(cache_key)
                    if cached:
                        yield json.dumps(
                            {
                                "type": "stock_data",
                                "payload": {
                                    "ticker": ticker,
                                    "company_info": cached.get("company_info"),
                                    "historical_prices": cached.get(
                                        "historical_prices"
                                    ),
                                    "charts_data": cached.get("charts_data"),
                                    "technical_data": cached.get("technical_data"),
                                    "fundamental_data": cached.get("fundamental_data"),
                                    "market_data": cached.get("market_data"),
                                },
                            }
                        ) + "\n"
                        yield json.dumps(
                            {
                                "type": "complete_analysis",
                                "payload": cached,
                            }
                        ) + "\n"
                        if user is None:
                            await analysis_service.increment_ip_search(client_ip)
                        return

            try:
                # 3. Retrieve deterministic stock data bundle from StockDataService (cache-first)
                processed_bundle = await stock_service.get_stock_bundle(ticker)

                # Yield stock data chunk immediately to the client
                yield json.dumps(
                    {
                        "type": "stock_data",
                        "payload": {
                            "ticker": ticker,
                            "company_info": processed_bundle.get("company_info"),
                            "historical_prices": processed_bundle.get(
                                "historical_prices"
                            ),
                            "charts_data": processed_bundle.get("charts_data"),
                            "technical_data": processed_bundle.get("technical_data"),
                            "fundamental_data": processed_bundle.get(
                                "fundamental_data"
                            ),
                            "market_data": processed_bundle.get("market_data"),
                        },
                    }
                ) + "\n"

                # 4. Execute graph (pre-warmed with processed_bundle)
                logger.info(f"Starting graph execution (stream) | ticker={ticker}")
                graph = build_graph(
                    openrouter_api_key=resolved_api_key,
                    thinking_level=body.thinking_mode,
                )
                final_state = await asyncio.to_thread(
                    graph.invoke,
                    {
                        "ticker_of_company": ticker,
                        "include_debate": body.include_debate,
                        "data_bundle": processed_bundle,
                        "charts_data": processed_bundle.get("charts_data", {}),
                    },
                )
                logger.info(f"Graph execution completed (stream) | ticker={ticker}")

                if user is None:
                    await analysis_service.increment_ip_search(client_ip)

                data_bundle = final_state.get("data_bundle", {})

                response = AnalyzeResponse(
                    ticker=ticker,
                    news_report=final_state.get("news_analyst_report", {}),
                    technical_report=final_state.get("technical_analyst_report", {}),
                    fundamental_report=final_state.get(
                        "fundamental_analyst_report", {}
                    ),
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
                    bull_thesis=final_state.get("investment_debate", {}).get(
                        "bull_thesis"
                    ),
                    bear_thesis=final_state.get("investment_debate", {}).get(
                        "bear_thesis"
                    ),
                    analyst_summaries={
                        "market_analyst_summary": final_state.get(
                            "market_analyst_summary", {}
                        ),
                        "fundamental_analyst_summary": final_state.get(
                            "fundamental_analyst_summary", {}
                        ),
                        "technical_analyst_summary": final_state.get(
                            "technical_analyst_summary", {}
                        ),
                        "news_analyst_summary": final_state.get(
                            "news_analyst_summary", {}
                        ),
                        "sector_analyst_summary": final_state.get(
                            "sector_analyst_summary", {}
                        ),
                    },
                    status="success",
                )

                # Cache in Redis for 20 minutes (1200s) only if complete and valid
                is_valid, cache_errors = validate_analysis_for_cache(response)
                if is_valid:
                    await cache_service.set_json(
                        cache_key, response.model_dump(), ttl_seconds=1200
                    )
                    logger.info(
                        f"Analysis successfully cached in Redis | ticker={ticker}"
                    )
                else:
                    logger.warning(
                        f"Analysis validation failed for cache | ticker={ticker} | SKIPPING REDIS CACHE | errors={cache_errors}"
                    )

                yield json.dumps(
                    {
                        "type": "complete_analysis",
                        "payload": response.model_dump(),
                    }
                ) + "\n"

            except Exception as e:
                err = handle_pipeline_error(e, ticker=ticker, domain="analysis")
                title = "Analysis Error"
                message = str(e)
                if hasattr(err, "detail") and isinstance(err.detail, dict):
                    title = err.detail.get("error", "Analysis Error")
                    message = err.detail.get("message", str(e))
                yield json.dumps(
                    {
                        "type": "error",
                        "payload": {"title": title, "message": message},
                    }
                ) + "\n"
            finally:
                await cache_service.release_lock(lock_key)

        return StreamingResponse(stream_generator(), media_type="application/x-ndjson")

    # ── Non-streaming fallback execution ──
    # 1. Check Redis Cache
    cached_report = await cache_service.get_json(cache_key)
    if cached_report:
        is_valid, errs = validate_analysis_for_cache(cached_report)
        if is_valid:
            logger.info(f"Analysis cache HIT | ticker={ticker}")
            if user is None:
                await analysis_service.increment_ip_search(client_ip)
            return AnalyzeResponse(**cached_report)
        else:
            logger.warning(
                f"Corrupted analysis found in cache | ticker={ticker} | evicting | errors={errs}"
            )
            await cache_service.delete(cache_key)

    # 2. Check Concurrent Lock if another request is running the same analysis
    lock_acquired = await cache_service.acquire_lock(lock_key, ttl_seconds=600)
    if not lock_acquired:
        logger.info(
            f"Concurrent lock active for ticker={ticker}. Polling cache every 2 mins (max 10 mins)..."
        )
        for _ in range(5):
            await asyncio.sleep(120)
            cached_report = await cache_service.get_json(cache_key)
            if cached_report:
                is_valid, _ = validate_analysis_for_cache(cached_report)
                if is_valid:
                    logger.info(
                        f"Analysis cache HIT via polling lock | ticker={ticker}"
                    )
                    if user is None:
                        await analysis_service.increment_ip_search(client_ip)
                    return AnalyzeResponse(**cached_report)

    try:
        # Pre-warm or fetch deterministic bundle via StockDataService
        processed_bundle = await stock_service.get_stock_bundle(ticker)

        logger.info(f"Starting graph execution | ticker={ticker}")
        graph = build_graph(
            openrouter_api_key=resolved_api_key, thinking_level=body.thinking_mode
        )
        final_state = await asyncio.to_thread(
            graph.invoke,
            {
                "ticker_of_company": ticker,
                "include_debate": body.include_debate,
                "data_bundle": processed_bundle,
                "charts_data": processed_bundle.get("charts_data", {}),
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

        # Cache response in Redis for 20 minutes (1200s) only if complete and valid
        is_valid, cache_errors = validate_analysis_for_cache(response)
        if is_valid:
            await cache_service.set_json(
                cache_key, response.model_dump(), ttl_seconds=1200
            )
            logger.info(f"Analysis successfully cached in Redis | ticker={ticker}")
        else:
            logger.warning(
                f"Analysis validation failed for cache | ticker={ticker} | SKIPPING REDIS CACHE | errors={cache_errors}"
            )

        return response

    except Exception as e:
        raise handle_pipeline_error(e, ticker=ticker, domain="analysis")
    finally:
        await cache_service.release_lock(lock_key)
