from tools.fundamental_tools import process_fundamental_data
from tools.technical_tools import process_technical_data
from tools.sector_tools import get_company_sector
from tools.market_tools import process_market_data
from tools.news_tools import (
    get_company_news,
    get_indian_market_news,
    get_global_market_news,
)
from tools.chart_tools import extract_charts_data
import json


def process_prefetch_result(raw_data: dict) -> dict:
    """
    Process the raw data fetched in the prefetch step to extract relevant information
    for each analyst. Make the raw_bundlle to the structured format expected by the analysts.
    This function serves as a bridge between the raw data collection and the structured analysis stages.
    """
    processed_bundle = {}

    processed_bundle["technical_data"] = process_technical_data(raw_data)

    processed_bundle["fundamental_data"] = process_fundamental_data(raw_data)

    processed_bundle["market_data"] = process_market_data(
        ticker=raw_data.get("ticker"),
        prefetched_indices=raw_data.get("market_indices", {}),
    )

    processed_bundle["news_data"] = {
        "company_news": get_company_news(
            ticker=raw_data.get("ticker"), prefetched_news=raw_data.get("news", [])
        ),
        "indian_news": get_indian_market_news(),
        "global_news": get_global_market_news(),
    }
    processed_bundle["sector_data"] = get_company_sector(
        ticker=raw_data.get("ticker", ""), prefetched_info=raw_data.get("info", {})
    )

    # Attach raw company info and serialized ohlcv data for frontend charts/overview
    info = raw_data.get("info", {})
    allowed_keys = {
        "symbol",
        "longName",
        "shortName",
        "name",
        "currency",
        "previousClose",
        "regularMarketPreviousClose",
        "open",
        "regularMarketOpen",
        "dayHigh",
        "regularMarketDayHigh",
        "dayLow",
        "regularMarketDayLow",
        "currentPrice",
        "regularMarketPrice",
        "marketCap",
        "trailingPE",
        "forwardPE",
        "volume",
        "regularMarketVolume",
        "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow",
        "sector",
        "industry",
        "longBusinessSummary",
        "description",
    }
    processed_bundle["company_info"] = {k: info[k] for k in allowed_keys if k in info}

    ohlcv_df = raw_data.get("ohlcv")
    ohlcv_list = []
    if ohlcv_df is not None and not ohlcv_df.empty:
        try:
            for date, row in ohlcv_df.iterrows():
                ohlcv_list.append(
                    {
                        "date": date.strftime("%Y-%m-%d"),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": int(row["Volume"]) if "Volume" in row else 0,
                    }
                )
        except Exception:
            pass
    processed_bundle["historical_prices"] = ohlcv_list

    charts_data = extract_charts_data(raw_data, processed_bundle["fundamental_data"])
    processed_bundle["charts_data"] = charts_data

    # with open("data.json", "w+") as f:
    #     json.dump(processed_bundle, f, indent=2)

    return processed_bundle
