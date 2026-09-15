from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException

from api.models import (
    AnalysisSummary,
    AnalysisDetail,
    SaveAnalysisRequest,
    SaveAnalysisResponse,
    AuthUser,
)
from api.dependencies import (
    get_analysis_service,
    get_current_user,
)
from services.analysis_service import AnalysisService
from core.logging import get_logger
from api.utils import limiter

logger = get_logger(__name__)
router = APIRouter(prefix="/analyses", tags=["Analyses History"])


@router.post("/save", response_model=SaveAnalysisResponse)
@limiter.limit("10/minute")
async def save_analysis_route(
    request: Request,
    body: SaveAnalysisRequest,
    user: AuthUser = Depends(get_current_user),
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
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


@router.get("/history", response_model=list[AnalysisSummary])
async def list_analyses(
    user: AuthUser = Depends(get_current_user),
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    docs = await analysis_service.get_user_analyses(user.id, limit=5)
    result = []

    for doc in docs:
        analyzed_at = doc.get("analyzed_at")
        if isinstance(analyzed_at, (int, float)):
            analyzed_at = datetime.fromtimestamp(analyzed_at, tz=timezone.utc)
        elif isinstance(analyzed_at, str):
            try:
                analyzed_at = datetime.fromisoformat(analyzed_at)
            except Exception:
                pass
        if (
            isinstance(analyzed_at, datetime)
            and getattr(analyzed_at, "tzinfo", None) is None
        ):
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


@router.get("/{analysis_id}", response_model=AnalysisDetail)
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

    analyzed_at = doc.get("analyzed_at")
    if isinstance(analyzed_at, (int, float)):
        analyzed_at = datetime.fromtimestamp(analyzed_at, tz=timezone.utc)
    elif isinstance(analyzed_at, str):
        try:
            analyzed_at = datetime.fromisoformat(analyzed_at)
        except Exception:
            pass
    if (
        isinstance(analyzed_at, datetime)
        and getattr(analyzed_at, "tzinfo", None) is None
    ):
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
