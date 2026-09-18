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
import json
from pathlib import Path
from repositories.analysis_repository import AnalysisRepository

logger = get_logger(__name__)


class AnalysisService:
    NSE_LIST_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    _CACHE_TTL_SEC = 86_400

    # Keeping cache in-memory as per user request
    _cache = {
        "nse_symbols": set(),
        "nse_tickers": [],
        "loaded_at": 0,
    }
    _cache_lock = threading.Lock()
    _FORMAT_RE = re.compile(r"^[A-Z0-9&\-]{1,20}\.NS$", re.IGNORECASE)

    def __init__(self, analysis_repository: AnalysisRepository):
        self.analysis_repository = analysis_repository

    def _load_bundled_nse_symbols(self) -> tuple[set[str], list[dict[str, str]]]:
        """Load tickers from bundled local JSON file when live exchange URL is unreachable."""
        candidates = [
            Path(__file__).resolve().parent.parent / "data" / "nse_tickers.json",
            Path("/app/data/nse_tickers.json"),
            Path("data/nse_tickers.json"),
            Path(__file__).resolve().parent.parent.parent
            / "frontend"
            / "public"
            / "nse-tickers.json",
        ]
        for path in candidates:
            if path.is_file():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        tickers = json.load(f)
                    symbols = {
                        t["symbol"].strip().upper() for t in tickers if t.get("symbol")
                    }
                    tickers.sort(key=lambda x: x["symbol"])
                    logger.info(
                        f"Loaded {len(symbols)} NSE symbols from bundled file: {path.name}"
                    )
                    return symbols, tickers
                except Exception as e:
                    logger.warning(f"Failed to read bundled tickers from {path}: {e}")

        logger.error("No bundled NSE tickers file found")
        return set(), []

    def _load_nse_symbols(self) -> tuple[set[str], list[dict[str, str]]]:
        # 1. Attempt live fetch from NSE with full browser headers
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.nseindia.com/",
            }
            resp = requests.get(self.NSE_LIST_URL, headers=headers, timeout=10)
            if resp.status_code == 200:
                df = pd.read_csv(StringIO(resp.text))
                df.columns = df.columns.str.strip()

                symbols = set()
                tickers = []
                for _, row in df.iterrows():
                    sym = str(row["SYMBOL"]).strip().upper()
                    name = str(row.get("NAME OF COMPANY", sym)).strip()
                    if sym:
                        symbols.add(sym)
                        tickers.append({"symbol": sym, "name": name})

                tickers.sort(key=lambda x: x["symbol"])
                logger.info(f"NSE symbols loaded from live feed: {len(symbols)}")
                return symbols, tickers
            else:
                logger.warning(
                    f"NSE remote feed returned HTTP {resp.status_code}; falling back to bundled dataset"
                )
        except Exception as exc:
            logger.warning(
                f"NSE live fetch unavailable ({exc}); falling back to bundled dataset"
            )

        # 2. Fall back to bundled local dataset
        return self._load_bundled_nse_symbols()

    def _refresh_cache_if_stale(self) -> None:
        with self._cache_lock:
            age = time.time() - self._cache["loaded_at"]
            if age < self._CACHE_TTL_SEC and self._cache["nse_symbols"]:
                return
            logger.info("Refreshing ticker symbol cache...")
            symbols, tickers = self._load_nse_symbols()
            self._cache["nse_symbols"] = symbols
            self._cache["nse_tickers"] = tickers
            self._cache["loaded_at"] = time.time()
            logger.info(
                f"Ticker cache refreshed | NSE={len(self._cache['nse_symbols'])}"
            )

    def pre_warm_cache(self) -> None:
        self._refresh_cache_if_stale()

    async def get_nse_tickers(self) -> list[dict[str, str]]:
        await asyncio.to_thread(self._refresh_cache_if_stale)
        return self._cache.get("nse_tickers", [])

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
        if not ticker or not doc or not isinstance(doc, dict):
            raise ValueError("Cannot save analysis with empty ticker or document")
        return await self.analysis_repository.save_analysis(user_id, ticker, doc)

    async def increment_ip_search(self, client_ip: str):
        await self.analysis_repository.increment_ip_search(client_ip)

    async def get_ip_search_count(self, client_ip: str) -> int:
        return await self.analysis_repository.get_ip_search_count(client_ip)
