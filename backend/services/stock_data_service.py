import asyncio
import time
from typing import Any, Optional
from services.cache_service import CacheService
from core.logging import get_logger
from tools.data_preftech import prefetch_ticker_bundle
from tools.data_processor import process_prefetch_result

logger = get_logger(__name__)


def validate_stock_bundle(bundle: Any) -> tuple[bool, list[str]]:
    """
    Validate that a processed market bundle contains all essential valid data fields
    before it is written to the Redis cache.
    Prevents cache poisoning from empty, partial, or failed upstream fetches.
    """
    errors: list[str] = []
    if not bundle or not isinstance(bundle, dict):
        return False, ["Bundle is empty or not a dictionary"]

    status = bundle.get("status")
    if status in ("failed", "invalid_ticker", "error"):
        errors.append(f"Bundle status is '{status}'")

    if bundle.get("error"):
        errors.append(f"Bundle contains error: {bundle.get('error')}")

    # 1. Company Info Validation
    company_info = bundle.get("company_info")
    if not company_info or not isinstance(company_info, dict):
        errors.append("company_info is missing or not a dictionary")
    else:
        # Must have at least one valid price metric > 0
        price_fields = [
            company_info.get("currentPrice"),
            company_info.get("regularMarketPrice"),
            company_info.get("previousClose"),
            company_info.get("regularMarketPreviousClose"),
        ]
        has_valid_price = any(
            isinstance(p, (int, float)) and p > 0 for p in price_fields if p is not None
        )
        if not has_valid_price:
            errors.append(
                "company_info is missing valid price fields (currentPrice/regularMarketPrice/previousClose)"
            )

        # Must have a recognizable name or symbol
        name_fields = [
            company_info.get("symbol"),
            company_info.get("shortName"),
            company_info.get("longName"),
            company_info.get("name"),
        ]
        has_name = any(
            isinstance(n, str) and n.strip() for n in name_fields if n is not None
        )
        if not has_name:
            errors.append("company_info is missing symbol or company name")

    # 2. Historical Prices Validation
    historical_prices = bundle.get("historical_prices")
    if (
        not historical_prices
        or not isinstance(historical_prices, list)
        or len(historical_prices) == 0
    ):
        errors.append("historical_prices is missing or empty list")
    else:
        sample_candle = historical_prices[0]
        if not isinstance(sample_candle, dict) or "close" not in sample_candle:
            errors.append(
                "historical_prices elements are malformed (missing close price)"
            )

    # 3. Technical Data Validation
    tech_data = bundle.get("technical_data")
    if not tech_data or not isinstance(tech_data, dict):
        errors.append("technical_data is missing or empty")

    # 4. Fundamental Data Validation
    fund_data = bundle.get("fundamental_data")
    if not fund_data or not isinstance(fund_data, dict):
        errors.append("fundamental_data is missing or empty")

    # 5. Charts Data Validation
    charts_data = bundle.get("charts_data")
    if not charts_data or not isinstance(charts_data, dict):
        errors.append("charts_data is missing or empty")

    return (len(errors) == 0, errors)


class StockDataService:
    """
    Centralized market data gateway for YFinance, IndianAPI, and indicators.
    Integrates with Upstash Redis via CacheService with differentiated TTLs:
    - Quotes: 60s
    - News: 300s (5 mins)
    - Indicators (RSI, MACD, MA): 600s (10 mins)
    - Fundamentals / Company Info: 43200s (12 hours)
    - Full Market Bundle: 600s (10 mins)
    """

    TTL_QUOTE = 60
    TTL_NEWS = 300
    TTL_INDICATORS = 600
    TTL_FUNDAMENTALS = 43200
    TTL_BUNDLE = 600

    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service or CacheService()

    async def get_cached_quote(self, ticker: str) -> Optional[dict[str, Any]]:
        key = f"market:quote:{ticker.upper()}"
        return await self.cache.get_json(key)

    async def set_cached_quote(self, ticker: str, data: dict[str, Any]) -> bool:
        if not data or not isinstance(data, dict):
            logger.warning(f"Rejecting cache write for empty quote | ticker={ticker}")
            return False
        key = f"market:quote:{ticker.upper()}"
        return await self.cache.set_json(key, data, ttl_seconds=self.TTL_QUOTE)

    async def get_cached_news(self, ticker: str) -> Optional[dict[str, Any]]:
        key = f"market:news:{ticker.upper()}"
        return await self.cache.get_json(key)

    async def set_cached_news(self, ticker: str, data: dict[str, Any]) -> bool:
        if not data or not isinstance(data, dict):
            logger.warning(f"Rejecting cache write for empty news | ticker={ticker}")
            return False
        key = f"market:news:{ticker.upper()}"
        return await self.cache.set_json(key, data, ttl_seconds=self.TTL_NEWS)

    async def get_cached_indicators(self, ticker: str) -> Optional[dict[str, Any]]:
        key = f"market:indicators:{ticker.upper()}"
        return await self.cache.get_json(key)

    async def set_cached_indicators(self, ticker: str, data: dict[str, Any]) -> bool:
        if not data or not isinstance(data, dict):
            logger.warning(
                f"Rejecting cache write for empty indicators | ticker={ticker}"
            )
            return False
        key = f"market:indicators:{ticker.upper()}"
        return await self.cache.set_json(key, data, ttl_seconds=self.TTL_INDICATORS)

    async def get_cached_fundamentals(self, ticker: str) -> Optional[dict[str, Any]]:
        key = f"market:fundamentals:{ticker.upper()}"
        return await self.cache.get_json(key)

    async def set_cached_fundamentals(self, ticker: str, data: dict[str, Any]) -> bool:
        if not data or not isinstance(data, dict):
            logger.warning(
                f"Rejecting cache write for empty fundamentals | ticker={ticker}"
            )
            return False
        key = f"market:fundamentals:{ticker.upper()}"
        return await self.cache.set_json(key, data, ttl_seconds=self.TTL_FUNDAMENTALS)

    async def get_stock_bundle(
        self, ticker: str, force_refresh: bool = False
    ) -> dict[str, Any]:
        """
        Retrieve processed deterministic stock data bundle.
        Checks Redis cache first. On miss, runs thread-safe prefetch + processing
        with a lightweight distributed lock to prevent thundering herd.
        """
        symbol = ticker.strip().upper()
        cache_key = f"market:bundle:{symbol}"
        lock_key = f"market:lock:{symbol}"

        if not force_refresh:
            cached_bundle = await self.cache.get_json(cache_key)
            if cached_bundle:
                # Secondary validation: verify cached bundle is not corrupted or empty
                is_valid, errs = validate_stock_bundle(cached_bundle)
                if is_valid:
                    logger.info(f"Market bundle cache hit | ticker={symbol}")
                    cached_bundle["cached"] = True
                    return cached_bundle
                else:
                    logger.warning(
                        f"Corrupted bundle found in cache | ticker={symbol} | evicting | errors={errs}"
                    )
                    await self.cache.delete(cache_key)

        # Acquire lock to prevent duplicate simultaneous fetches
        lock_acquired = await self.cache.acquire_lock(lock_key, ttl_seconds=30)
        if not lock_acquired:
            logger.info(
                f"Another request fetching bundle | ticker={symbol}, waiting..."
            )
            for _ in range(5):
                await asyncio.sleep(2)
                cached_bundle = await self.cache.get_json(cache_key)
                if cached_bundle:
                    is_valid, _ = validate_stock_bundle(cached_bundle)
                    if is_valid:
                        cached_bundle["cached"] = True
                        return cached_bundle

        try:
            logger.info(f"Fetching raw market bundle from source | ticker={symbol}")
            raw_bundle = await asyncio.to_thread(prefetch_ticker_bundle, symbol)
            if not isinstance(raw_bundle, dict) or raw_bundle.get("status") in (
                "invalid_ticker",
                "failed",
            ):
                return {
                    "ticker": symbol,
                    "status": (
                        raw_bundle.get("status", "failed")
                        if isinstance(raw_bundle, dict)
                        else "failed"
                    ),
                    "error": (
                        raw_bundle.get("error", "Failed to retrieve stock data")
                        if isinstance(raw_bundle, dict)
                        else "Unknown error"
                    ),
                    "cached": False,
                }

            processed = await asyncio.to_thread(process_prefetch_result, raw_bundle)
            processed["ticker"] = symbol

            # Validate bundle completeness before writing to Redis
            is_valid, validation_errors = validate_stock_bundle(processed)
            if is_valid:
                processed["status"] = "success"
                # Cache in Redis with differentiated bundle TTL
                await self.cache.set_json(
                    cache_key, processed, ttl_seconds=self.TTL_BUNDLE
                )
                logger.info(f"Market bundle successfully cached | ticker={symbol}")
                return {**processed, "cached": False}
            else:
                logger.warning(
                    f"Market bundle validation failed | ticker={symbol} | SKIPPING CACHE WRITE | errors={validation_errors}"
                )
                processed["status"] = "failed"
                processed["error"] = (
                    f"Incomplete market data: {'; '.join(validation_errors)}"
                )
                return {**processed, "cached": False}
        finally:
            if lock_acquired:
                await self.cache.release_lock(lock_key)
