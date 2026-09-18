from fastapi import APIRouter, Depends, HTTPException, Request, Response
from api.models import StockDataResponse
from api.dependencies import get_stock_data_service
from services.stock_data_service import StockDataService
from core.logging import get_logger
from api.utils import limiter

logger = get_logger(__name__)

router = APIRouter(prefix="/stocks", tags=["Market Data"])


@router.get("/{ticker}", response_model=StockDataResponse)
@limiter.limit("60/minute")
async def get_stock_data(
    request: Request,
    ticker: str,
    response: Response,
    force_refresh: bool = False,
    stock_service: StockDataService = Depends(get_stock_data_service),
):
    """
    Dedicated high-speed deterministic market data layer.
    Returns quotes, indicators, financial ratios, and interactive chart points
    without spinning up AI agent reasoning or consuming LLM token budgets.
    """
    symbol = ticker.strip().upper()
    if not symbol or len(symbol) > 20:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_ticker",
                "message": "Invalid stock ticker format.",
            },
        )

    bundle = await stock_service.get_stock_bundle(symbol, force_refresh=force_refresh)

    if bundle.get("status") == "invalid_ticker":
        raise HTTPException(
            status_code=404,
            detail={
                "error": "ticker_not_found",
                "message": bundle.get(
                    "error", f"Ticker '{symbol}' not found on exchange."
                ),
            },
        )

    if bundle.get("status") == "failed" and not bundle.get("company_info"):
        raise HTTPException(
            status_code=502,
            detail={
                "error": "market_data_unavailable",
                "message": bundle.get(
                    "error", "Failed to fetch market data from data source."
                ),
            },
        )

    # Set client-side HTTP caching header (1 minute for fresh data)
    response.headers["Cache-Control"] = "public, max-age=60"

    return StockDataResponse(
        ticker=symbol,
        company_info=bundle.get("company_info"),
        historical_prices=bundle.get("historical_prices"),
        charts_data=bundle.get("charts_data"),
        fundamental_data=bundle.get("fundamental_data"),
        technical_data=bundle.get("technical_data"),
        market_data=bundle.get("market_data"),
        news_data=bundle.get("news_data"),
        sector_data=bundle.get("sector_data"),
        status="success",
        cached=bundle.get("cached", False),
    )
