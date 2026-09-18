import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Request, Header, HTTPException

from api.models import (
    DebateRequest,
    DebateResponse,
    AuthUser,
)
from api.dependencies import (
    get_analysis_service,
    get_cache_service,
    get_current_user_optional,
)
from services.analysis_service import AnalysisService
from services.cache_service import CacheService
from core.logging import get_logger
from graph.builder import build_debate_graph
from graph.validators import validate_analyst_schemas
from api.utils import (
    limiter,
    resolve_openrouter_key,
    handle_pipeline_error,
)

logger = get_logger(__name__)
router = APIRouter(tags=["Debate"])


@router.post("/debate", response_model=DebateResponse)
@limiter.limit("10/minute")
async def run_debate_route(
    request: Request,
    body: DebateRequest,
    user: Optional[AuthUser] = Depends(get_current_user_optional),
    cache_service: CacheService = Depends(get_cache_service),
    analysis_service: AnalysisService = Depends(get_analysis_service),
    openrouter_api_key: Optional[str] = Header(None, alias="OpenRouter-API-Key"),
    x_openrouter_api_key: Optional[str] = Header(None, alias="X-Openrouter-Api-Key"),
):
    """
    Decoupled debate & verdict execution:
    Runs ONLY the Bull Researcher -> Bear Researcher -> Research Manager pipeline.

    Accepts:
    1. Analyst reports/summaries directly in request body (sent from frontend state).
    2. Or falls back to checking Redis cache for 'analysis:{ticker}:basic' or 'analysis:{ticker}:full'.

    Requires NO data fetching and NO re-running of the 5 specialist analysts.
    """
    ticker = body.ticker.upper().strip()
    logger.info(
        f"Received /debate request | ticker={ticker} | user={user.email if user else 'anonymous'}"
    )

    resolved_api_key = resolve_openrouter_key(
        request, openrouter_api_key, x_openrouter_api_key
    )
    if not resolved_api_key:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "missing_api_key",
                "message": "OpenRouter API key is required. Please provide it in settings or set OPENROUTER_API_KEY.",
            },
        )

    # 1. Check client-supplied analyst data in request body
    summaries = body.analyst_summaries or {}
    market_summary = summaries.get("market_analyst_summary") or body.market_report
    fundamental_summary = (
        summaries.get("fundamental_analyst_summary") or body.fundamental_report
    )
    technical_summary = (
        summaries.get("technical_analyst_summary") or body.technical_report
    )
    news_summary = summaries.get("news_analyst_summary") or body.news_report
    sector_summary = summaries.get("sector_analyst_summary") or body.sector_report

    has_analyst_data = any(
        [
            market_summary,
            fundamental_summary,
            technical_summary,
            news_summary,
            sector_summary,
        ]
    )

    # 2. Fall back to Redis cache if client didn't supply them
    if not has_analyst_data:
        cached_basic = await cache_service.get_json(f"analysis:{ticker}:basic")
        if not cached_basic:
            cached_basic = await cache_service.get_json(f"analysis:{ticker}:full")

        if cached_basic:
            logger.info(f"Hydrating debate state from Redis cache | ticker={ticker}")
            cached_summaries = cached_basic.get("analyst_summaries") or {}
            market_summary = cached_summaries.get(
                "market_analyst_summary"
            ) or cached_basic.get("market_report")
            fundamental_summary = cached_summaries.get(
                "fundamental_analyst_summary"
            ) or cached_basic.get("fundamental_report")
            technical_summary = cached_summaries.get(
                "technical_analyst_summary"
            ) or cached_basic.get("technical_report")
            news_summary = cached_summaries.get(
                "news_analyst_summary"
            ) or cached_basic.get("news_report")
            sector_summary = cached_summaries.get(
                "sector_analyst_summary"
            ) or cached_basic.get("sector_report")
            has_analyst_data = any(
                [
                    market_summary,
                    fundamental_summary,
                    technical_summary,
                    news_summary,
                    sector_summary,
                ]
            )

    if not has_analyst_data:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "missing_analysis",
                "message": f"No prior analyst reports found for '{ticker}'. Please run the 5-analyst analysis first.",
            },
        )

    # Retrieve ground-truth quantitative data for debate baseline
    tech_data = body.technical_data
    fund_data = body.fundamental_data
    comp_info = body.company_info

    if not (tech_data and fund_data and comp_info):
        # 1. First check new dedicated market data layer cache
        market_bundle = await cache_service.get_json(f"market:bundle:{ticker}")
        if market_bundle:
            tech_data = tech_data or market_bundle.get("technical_data")
            fund_data = fund_data or market_bundle.get("fundamental_data")
            comp_info = comp_info or market_bundle.get("company_info")

        # 2. Fallback to analysis cache
        if not (tech_data and fund_data and comp_info):
            cached = await cache_service.get_json(f"analysis:{ticker}:basic")
            if not cached:
                cached = await cache_service.get_json(f"analysis:{ticker}:full")
            if cached:
                tech_data = tech_data or cached.get("technical_data")
                fund_data = fund_data or cached.get("fundamental_data")
                comp_info = comp_info or cached.get("company_info")

    initial_debate_state = {
        "ticker_of_company": ticker,
        "include_debate": True,
        "market_analyst_summary": market_summary or {},
        "market_analyst_report": body.market_report or {},
        "fundamental_analyst_summary": fundamental_summary or {},
        "fundamental_analyst_report": body.fundamental_report or {},
        "technical_analyst_summary": technical_summary or {},
        "technical_analyst_report": body.technical_report or {},
        "news_analyst_summary": news_summary or {},
        "news_analyst_report": body.news_report or {},
        "sector_analyst_summary": sector_summary or {},
        "sector_analyst_report": body.sector_report or {},
        "technical_data": tech_data or {},
        "fundamental_data": fund_data or {},
        "company_info": comp_info or {},
        "data_bundle": {
            "technical_data": tech_data or {},
            "fundamental_data": fund_data or {},
            "company_info": comp_info or {},
        },
        "investment_debate": {
            "bull_thesis": "",
            "bear_thesis": "",
            "debate_history": "",
            "final_decision": "",
            "debate_rounds": 0,
            "last_speaker": "",
        },
    }

    # Gate 1: Ensure all 5 analyst reports strictly comply with schemas before launching debate
    is_valid, validation_errors = validate_analyst_schemas(initial_debate_state)
    if not is_valid:
        error_details = "; ".join(validation_errors)
        logger.warning(
            f"Gate 1 Failed for /debate | ticker={ticker} | errors={error_details}"
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_analysts",
                "message": f"Debate cannot proceed because analyst data is incomplete or invalid according to schema: {error_details}",
            },
        )

    try:
        logger.info(f"Starting decoupled debate graph execution | ticker={ticker}")
        debate_graph = build_debate_graph(
            openrouter_api_key=resolved_api_key, thinking_level=body.thinking_mode
        )
        final_state = await asyncio.to_thread(
            debate_graph.invoke,
            initial_debate_state,
        )
        logger.info(f"Debate graph execution completed | ticker={ticker}")

        investment_debate = final_state.get("investment_debate", {})
        verdict = final_state.get("verdict")
        bull_thesis = investment_debate.get("bull_thesis")
        bear_thesis = investment_debate.get("bear_thesis")

        valid_bull = (
            bull_thesis
            if isinstance(bull_thesis, dict) and bull_thesis.get("status") != "failure"
            else None
        )
        valid_bear = (
            bear_thesis
            if isinstance(bear_thesis, dict) and bear_thesis.get("status") != "failure"
            else None
        )

        response = DebateResponse(
            ticker=ticker,
            bull_thesis=valid_bull,
            bear_thesis=valid_bear,
            verdict=verdict,
            status="success" if verdict else "partial",
        )

        # Cache debate in Redis for 20 minutes (1200s) only if complete and successful
        if (
            response.status == "success"
            and verdict
            and isinstance(verdict, dict)
            and verdict.get("decision") in ("BUY", "SELL", "HOLD")
            and valid_bull
            and valid_bear
        ):
            await cache_service.set_json(
                f"debate:{ticker}", response.model_dump(), ttl_seconds=1200
            )
            logger.info(f"Complete debate cached in Redis | ticker={ticker}")
        else:
            logger.warning(
                f"Debate incomplete or failed | ticker={ticker} | SKIPPING REDIS CACHE | status={response.status}"
            )

        return response

    except Exception as e:
        raise handle_pipeline_error(e, ticker=ticker, domain="debate")
