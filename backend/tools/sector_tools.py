import re
import os
import json
from typing import Any
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from core.logging import get_logger
from core.constants import SectorName
from core.yf_context import YFinance401Error
from dotenv import load_dotenv

logger = get_logger(__name__)
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "artha_analytics"
COLLECTION_NAME = "sector_data"

# Module-level singleton — created once, reused across calls
_client = MongoClient(MONGODB_URI)


def get_company_sector(
    ticker: str, prefetched_info: dict | None = None
) -> dict[str, Any]:
    """
    Fetch raw company metadata (sector, industry, summary) from yfinance.

    This provides the 'rough' classification that the SectorAnalyst will
    later map to the official supported Indian sector catalog.
    """
    logger.info(f"Fetching yfinance metadata | ticker={ticker}")

    result = {
        "status": "failed",
        "ticker": ticker,
        "company": None,
        "sector": None,
        "industry": None,
        "business": None,
        "error": None,
    }

    info = prefetched_info or {}

    try:
        if (
            isinstance(info, dict)
            and info
            and info.get("sector") not in [None, "", "N/A"]
            and info.get("industry") not in [None, "", "N/A"]
        ):

            result.update(
                {
                    "status": "success",
                    "company": info.get("longName", "N/A"),
                    "sector": info.get("sector", "N/A"),
                    "industry": info.get("industry", "N/A"),
                    "business": info.get("longBusinessSummary", "N/A"),
                }
            )

        else:
            logger.warning(
                f"Incomplete or missing metadata from yfinance | ticker={ticker}"
            )
            result["error"] = "Ticker metadata is incomplete or not found."

    except YFinance401Error as e:
        result["error"] = f"401 Unauthorized in '{e.caller}'"
        return result

    except Exception as exc:
        logger.error(f"yfinance error | ticker={ticker} | {exc}")
        result["error"] = f"Failed to retrieve company info: {exc}"

    return result


def get_sector_content(sector_name: str) -> dict:
    """
    Fetch sector report + summary from MongoDB.

    Returns on success:
        {
            "status": "success",
            "sector_name": str,
            "report": str,
            "summary": dict,
            "created_at": datetime
        }

    Returns on failure:
        {
            "status": "failed",
            "error": str
        }
    """
    try:
        collection = _client[DB_NAME][COLLECTION_NAME]

        document = collection.find_one({"sector_name": sector_name}, {"_id": 0})

        if not document:
            return {
                "status": "failed",
                "error": f"Sector '{sector_name}' not found in DB",
            }

        report = document.get("report", "")
        summary = document.get("summary", {})

        if not report:
            logger.warning(f"Missing 'report' field | sector={sector_name}")
        if not summary:
            logger.warning(f"Missing 'summary' field | sector={sector_name}")

        return {
            "status": "success",
            "sector_name": document["sector_name"],
            "report": report,
            "summary": summary,
            "created_at": document.get("created_at"),
        }

    except PyMongoError as e:
        # Catch DB-specific errors separately for cleaner logging
        logger.error(f"MongoDB error | sector={sector_name} | error={e}")
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        logger.error(f"Unexpected error | sector={sector_name} | error={e}")
        return {"status": "failed", "error": str(e)}


def validate_sector(sector_name: str) -> dict[str, Any]:
    """Validate sector_name against the official SectorName catalog."""
    valid_sector_names = {sector.value for sector in SectorName}
    if sector_name not in valid_sector_names:
        return {
            "status": "failed",
            "sector_name": None,
            "error": f"Sector {sector_name!r} is not in the supported catalog",
        }
    return {"status": "success", "sector_name": sector_name, "error": None}
