import pandas as pd
from typing import Any, Dict
import os
import requests
from dotenv import load_dotenv

from core.logging import get_logger

load_dotenv()

INDIANAPI_BASE_URL = os.getenv("INDIANAPI_BASE_URL", "https://stock.indianapi.in")
INDIANAPI_API_KEY = os.getenv("INDIANAPI_API_KEY")


def fetch_indianapi_fallback_data(name: str):
    """
    Fetch detailed stock data for a company by name (NSE/BSE).
    Example: name='Reliance', 'Tata Motors', etc.
    """
    if not INDIANAPI_API_KEY:
        raise ValueError("INDIANAPI_API_KEY is not set in the environment.")

    url = f"{INDIANAPI_BASE_URL}/stock"
    params = {"name": name}
    headers = {"x-api-key": INDIANAPI_API_KEY}

    resp = requests.get(url, params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


logger = get_logger(__name__)


def map_fallback_to_yf(data: dict, original_ticker: str) -> dict:
    """
    Translates IndianAPI fallback data into the structure expected by the backend
    (Pandas DataFrames for financials, dict for info, etc.), mimicking yfinance.
    """

    bundle = {
        "ticker": original_ticker,
        "status": "success",
        "error": None,
        "ohlcv": None,  # Ohlcv will be handled separately or remain None
        "financials": None,
        "balance_sheet": None,
        "cash_flow": None,
        "info": {},
        "major_holders": None,
        "news": [],
        "market_indices": {},
    }

    try:
        # 1. Map Info
        info_dict: Dict[str, Any] = {}

        # Flatten keyMetrics
        key_metrics = data.get("keyMetrics", {})
        if isinstance(key_metrics, dict):
            for category, metrics in key_metrics.items():
                if isinstance(metrics, list):
                    for item in metrics:
                        info_dict[item["key"]] = item["value"]

        # Company profile metrics
        profile = data.get("companyProfile", {})

        # Map values back to Yahoo Finance expected names
        def safe_float(val):
            if val is None or val == "null" or val == "":
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        # Fallback values mapped to YF names
        mapped_info = {
            "longName": data.get("companyName"),
            "shortName": data.get("companyName"),
            "symbol": original_ticker,
            "industry": data.get("industry"),
            "sector": profile.get("mgIndustry"),
            "trailingPE": safe_float(
                info_dict.get("pPerEBasicExcludingExtraordinaryItemsTTM")
            ),
            "pegRatio": safe_float(info_dict.get("pegRatio")),
            "dividendYield": (
                safe_float(
                    info_dict.get(
                        "dividendYieldIndicatedAnnualDividendDividedByClosingprice"
                    )
                )
                / 100.0
                if safe_float(
                    info_dict.get(
                        "dividendYieldIndicatedAnnualDividendDividedByClosingprice"
                    )
                )
                is not None
                else None
            ),
            "marketCap": None,  # Can add if available in peerCompanyList or similar
            "enterpriseToEbitda": safe_float(
                info_dict.get("currentEVPerFreeCashFlowLTM")
            ),  # Close approximation or leave None if strictly EBITDA
        }

        # Try extracting marketCap explicitly from stockDetailsReusableData
        market_cap_crores = data.get("stockDetailsReusableData", {}).get("marketCap")
        if market_cap_crores is not None:
            mapped_info["marketCap"] = (
                safe_float(market_cap_crores) * 10000000
            )  # API provides in crores (1 crore = 10,000,000)
        else:
            # Fallback Look for marketCap in peer company list
            peer_list = profile.get("peerCompanyList", [])
            if peer_list and isinstance(peer_list, list):
                for peer in peer_list:
                    if peer.get("companyName") == data.get("companyName"):
                        mapped_info["marketCap"] = (
                            safe_float(peer.get("marketCap")) * 10000000
                        )
                        break

        bundle["info"] = mapped_info

        # 2. Map Shareholding
        shareholding = data.get("shareholding", [])
        if shareholding and isinstance(shareholding, list):
            # Try to find promoter holding
            promoter_pct = None
            for item in shareholding:
                if isinstance(item, dict) and "Promoter" in item.get("category", ""):
                    promoter_pct = safe_float(item.get("percentage"))
                    break

            if promoter_pct is not None:
                # Mock a DataFrame similar to what yfinance produces for major_holders
                # Where iloc[0, 0] is promoter pct
                bundle["major_holders"] = pd.DataFrame(
                    [[promoter_pct / 100.0, "Promoters"]]
                )

        # 3. Map Financials (INC, BAL, CAS)
        inc_records = []
        bal_records = []
        cas_records = []

        for period in data.get("financials", []):
            date_str = period.get("EndDate")
            if not date_str:
                continue

            try:
                date_ts = pd.to_datetime(date_str)
            except Exception:
                continue

            fmap = period.get("stockFinancialMap", {})

            def extract_fmap(category_key, records_list):
                items = fmap.get(category_key)
                if not items:
                    return
                for item in items:
                    val = safe_float(item.get("value"))
                    # yfinance metrics are usually raw text strings.
                    # strip whitespace because API returns "Total Revenue "
                    metric_name = item.get("displayName", "").strip()
                    records_list.append(
                        {"Date": date_ts, "Metric": metric_name, "Value": val}
                    )

            extract_fmap("INC", inc_records)
            extract_fmap("BAL", bal_records)
            extract_fmap("CAS", cas_records)

        def build_df(records):
            if not records:
                return None
            df = pd.DataFrame(records)
            # Pivot so columns are Dates, Index are Metrics
            df = df.pivot_table(
                index="Metric", columns="Date", values="Value", aggfunc="first"
            )
            # Sort columns descending (newest first) to match yfinance
            df = df.reindex(sorted(df.columns, reverse=True), axis=1)
            return df

        bundle["financials"] = build_df(inc_records)
        bundle["balance_sheet"] = build_df(bal_records)
        bundle["cash_flow"] = build_df(cas_records)

        # News mapping
        news = data.get("recentNews", [])
        if news and isinstance(news, list):
            mapped_news = []
            for n in news:
                mapped_news.append(
                    {
                        "title": n.get("headline", ""),
                        "publisher": n.get("source", ""),
                        "link": n.get("url", ""),
                        "providerPublishTime": None,  # Can map date if available
                    }
                )
            bundle["news"] = mapped_news

    except Exception as e:
        logger.exception(f"Error mapping fallback data for {original_ticker}")
        bundle["status"] = "failed"
        bundle["error"] = f"Fallback mapping failed: {str(e)}"

    return bundle
