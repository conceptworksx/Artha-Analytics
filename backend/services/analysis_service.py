import os
import re
import time
import requests
import asyncio
import pandas as pd
import threading
from io import StringIO
from core.logging import get_logger
from core.exceptions import (
    InvalidTickerFormatError,
    TickerNotFoundError,
    InvalidAPIKeyError,
)
from repositories.analysis_repository import AnalysisRepository

logger = get_logger(__name__)


class AnalysisService:
    NSE_LIST_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    _CACHE_TTL_SEC = 86_400

    # Keeping cache in-memory as per user request
    _cache = {
        "nse_symbols": set(),
        "loaded_at": 0,
    }
    _cache_lock = threading.Lock()
    _FORMAT_RE = re.compile(r"^[A-Z0-9&\-]{1,20}\.NS$", re.IGNORECASE)

    def __init__(self, analysis_repository: AnalysisRepository):
        self.analysis_repository = analysis_repository

    def _load_nse_symbols(self) -> set[str]:
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = requests.get(self.NSE_LIST_URL, headers=headers, timeout=15)
            resp.raise_for_status()
            df = pd.read_csv(StringIO(resp.text))
            symbols = set(df["SYMBOL"].astype(str).str.strip().str.upper())
            logger.info(f"NSE symbols loaded: {len(symbols)}")
            return symbols
        except Exception as exc:
            logger.exception(f"NSE symbol fetch failed: {exc}")
            return set()

    def _refresh_cache_if_stale(self) -> None:
        with self._cache_lock:
            age = time.time() - self._cache["loaded_at"]
            if age < self._CACHE_TTL_SEC and self._cache["nse_symbols"]:
                return
            logger.info("Refreshing ticker symbol cache...")
            self._cache["nse_symbols"] = self._load_nse_symbols()
            self._cache["loaded_at"] = time.time()
            logger.info(
                f"Ticker cache refreshed | NSE={len(self._cache['nse_symbols'])}"
            )

    def pre_warm_cache(self) -> None:
        self._refresh_cache_if_stale()

    def validate_ticker_format(self, ticker: str) -> None:
        if not ticker or not ticker.strip():
            raise InvalidTickerFormatError("Ticker cannot be empty.")

        ticker = ticker.strip().upper()
        if not self._FORMAT_RE.match(ticker):
            logger.warning(f"Ticker format validation failed | ticker={ticker}")
            raise InvalidTickerFormatError(
                f"'{ticker}' is not a valid ticker format. Use NSE ticker format like 'RELIANCE.NS'."
            )

    async def validate_ticker_exists(self, ticker: str) -> None:
        await asyncio.to_thread(self._refresh_cache_if_stale)
        ticker = ticker.strip().upper()
        symbol, exchange = ticker.rsplit(".", 1)

        if exchange == "NS":
            if not self._cache["nse_symbols"]:
                logger.warning("NSE cache unavailable")
                raise TickerNotFoundError(
                    "Ticker validation service temporarily unavailable."
                )

            if symbol not in self._cache["nse_symbols"]:
                logger.warning(f"NSE Ticker not found | ticker={ticker}")
                raise TickerNotFoundError(
                    f"'{symbol}' was not found on NSE. Please verify the ticker symbol."
                )

    def validate_api_keys(self, openrouter_api_key: str) -> None:
        if not openrouter_api_key or not openrouter_api_key.strip():
            raise InvalidAPIKeyError("OpenRouter API key is required.")

        key = openrouter_api_key.strip()
        if not key.startswith("sk-or-v1-"):
            raise InvalidAPIKeyError(
                "Invalid OpenRouter API Key format. It should start with 'sk-or-v1-'."
            )

        try:
            response = requests.get(
                "https://openrouter.ai/api/v1/auth/key",
                headers={"Authorization": f"Bearer {key}"},
                timeout=10,
            )
            if response.status_code != 200:
                raise InvalidAPIKeyError("Invalid OpenRouter API key")
        except Exception:
            raise InvalidAPIKeyError("Failed to validate OpenRouter API key")

    async def get_user_analyses(self, user_id: str, limit: int = 5):
        return await self.analysis_repository.get_user_analyses(user_id, limit)

    async def get_analysis_by_id(self, analysis_id: str, user_id: str):
        return await self.analysis_repository.get_analysis_by_id(analysis_id, user_id)

    async def save_analysis(self, user_id: str, ticker: str, doc: dict) -> str:
        return await self.analysis_repository.save_analysis(user_id, ticker, doc)

    async def increment_ip_search(self, client_ip: str):
        await self.analysis_repository.increment_ip_search(client_ip)

    async def get_ip_search_count(self, client_ip: str) -> int:
        return await self.analysis_repository.get_ip_search_count(client_ip)
