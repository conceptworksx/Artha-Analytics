import json
import warnings
import pandas as pd
import yfinance as yf
import ta
from typing import Any
from tools.utils.technical_tool_helper import (
    _compute_mfi_condition_signal,
    _compute_rsi_condition,
    _compute_trend_alignment,
)
from core.yf_context import YFinance401Error, yf_call
from tools.utils.retry_utils import with_retry
from core.logging import get_logger

logger = get_logger(__name__)

warnings.filterwarnings("ignore")


def process_technical_data(x):
    """
    Process raw OHLCV data into a structured format with various technical indicators.
    It provides the evidance for the TechnicalAnalyst to make informed assessments on price action,
    momentum, volatility, and volume dynamics.
    """

    ticker = x.get("ticker")
    prefetched_ohlcv = x.get("ohlcv")

    if prefetched_ohlcv is not None and not prefetched_ohlcv.empty:
        df = prefetched_ohlcv
    else:
        return {
            "ticker": ticker,
            "status": "failed",
            "error": "No valid OHLCV data available",
        }
    return {
        "ticker": ticker,
        "status": "success",
        "price_levels": compute_price_levels(df),
        "moving_averages": compute_moving_averages(df),
        "rsi": compute_rsi(df),
        "macd": compute_macd(df),
        "bollinger": compute_bollinger(df),
        "atr": compute_atr(df),
        "vwma": compute_vwma(df),
        "mfi": compute_mfi(df),
        "volume": compute_volume(df),
    }


def compute_moving_averages(df: pd.DataFrame) -> dict[str, Any]:
    """
    Compute 10, 50, 100, and 200-day simple moving averages.
    """

    logger.debug("Computing moving averages")

    result = {
        "ma10": None,
        "ma50": None,
        "ma100": None,
        "ma200": None,
        "price_vs_ma10": None,
        "price_vs_ma50": None,
        "price_vs_ma100": None,
        "price_vs_ma200": None,
        "golden_cross": None,
        "death_cross": None,
        "trend_alignment": None,
        "status": "failed",
        "error": None,
    }

    try:
        if "Close" not in df:
            result["error"] = "Invalid Dataframe"
            return result

        close = df["Close"]
        if len(close) == 0:
            result["error"] = "No price data available"
            return result

        price = float(close.iloc[-1])
        above_count = 0
        valid_mas = 0

        for w in [10, 50, 100, 200]:
            try:
                raw = close.rolling(w).mean().iloc[-1]
                val = float(raw) if not pd.isna(raw) else None

                result[f"ma{w}"] = round(val, 2) if val is not None else None

                if val is not None:
                    result[f"price_vs_ma{w}"] = "ABOVE" if price > val else "BELOW"
                    above_count += int(price > val)
                    valid_mas += 1

            except Exception as e:
                logger.warning(f"MA{w} computation failed: {e}")
                continue

        ma50 = result["ma50"]
        ma200 = result["ma200"]

        result["golden_cross"] = bool(
            ma50 is not None and ma200 is not None and ma50 > ma200
        )
        result["death_cross"] = bool(
            ma50 is not None and ma200 is not None and ma50 < ma200
        )

        result["trend_alignment"] = (
            _compute_trend_alignment(above_count) if valid_mas > 0 else "UNKNOWN"
        )

        result["status"] = "success" if valid_mas == 4 else "partial"

        logger.debug(
            f"Moving averages computed | status={result['status']} "
            f"alignment={result['trend_alignment']}"
        )

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"Unexpected failure in MA computation: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_rsi(df: pd.DataFrame, window: int = 14) -> dict[str, Any]:
    """
    Compute RSI and derive overbought / oversold / divergence signals.
    """

    logger.debug(f"Computing RSI | window={window}")

    result = {
        "value": None,
        "condition": None,
        "trending_up": None,
        "bull_divergence": None,
        "bear_divergence": None,
        "status": "failed",
        "error": None,
    }

    try:
        if "Close" not in df:
            result["error"] = "invalid_dataframe_Close_is_not_present"
            return result

        close = df["Close"]

        if len(close) < window + 2:
            result["error"] = "insufficient_data_for_rsi"
            return result

        rsi_series = ta.momentum.RSIIndicator(close, window=window).rsi()

        if rsi_series.isna().all():
            result["error"] = "rsi_all_nan"
            return result

        cur = float(rsi_series.iloc[-1])
        prv = float(rsi_series.iloc[-2])

        condition = _compute_rsi_condition(cur)

        lkbk = 10

        if len(close) < lkbk + 2:
            bull_div = False
            bear_div = False
        else:
            try:
                price_ll = close.iloc[-1] == close.rolling(lkbk).min().iloc[-1]
                rsi_hl = (
                    rsi_series.rolling(lkbk).min().iloc[-1]
                    > rsi_series.shift(lkbk).iloc[-1]
                )
                bull_div = bool(price_ll and rsi_hl)

                price_hh = close.iloc[-1] == close.rolling(lkbk).max().iloc[-1]
                rsi_lh = (
                    rsi_series.rolling(lkbk).max().iloc[-1]
                    < rsi_series.shift(lkbk).iloc[-1]
                )
                bear_div = bool(price_hh and rsi_lh)

            except Exception as div_err:
                logger.warning(f"Divergence calc failed: {div_err}")
                bull_div, bear_div = False, False

        result.update(
            {
                "value": round(cur, 2),
                "condition": condition,
                "trending_up": cur > prv,
                "bull_divergence": bull_div,
                "bear_divergence": bear_div,
                "status": "success",
            }
        )

        if condition in ("OVERBOUGHT", "OVERSOLD"):
            logger.warning(f"RSI extreme zone | value={cur:.2f} condition={condition}")

        logger.debug(
            f"RSI computed | value={cur:.2f} condition={condition} "
            f"bull_div={bull_div} bear_div={bear_div}"
        )

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"RSI computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_macd(df: pd.DataFrame) -> dict[str, Any]:
    """
    Compute MACD (12, 26, 9) and derive crossover / momentum signals.
    """

    logger.debug("Computing MACD (12, 26, 9)")

    result = {
        "macd": None,
        "signal": None,
        "histogram": None,
        "above_signal": None,
        "bullish_cross": None,
        "bearish_cross": None,
        "histogram_expanding": None,
        "bias": None,
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty or "Close" not in df:
            result["error"] = "invalid_or_empty_dataframe"
            return result

        close = df["Close"]

        if len(close) < 30:
            result["error"] = "insufficient_data_for_macd"
            return result

        ind = ta.trend.MACD(close)

        m = ind.macd()
        s = ind.macd_signal()
        h = ind.macd_diff()

        # guard against NaNs
        if m.isna().all() or s.isna().all() or h.isna().all():
            result["error"] = "macd_all_nan"
            return result

        # safe indexing
        if len(m) < 2 or len(s) < 2 or len(h) < 2:
            result["error"] = "insufficient_indicator_history"
            return result

        cur_m, prv_m = float(m.iloc[-1]), float(m.iloc[-2])
        cur_s, prv_s = float(s.iloc[-1]), float(s.iloc[-2])
        cur_h, prv_h = float(h.iloc[-1]), float(h.iloc[-2])

        bullish_cross = prv_m < prv_s and cur_m >= cur_s
        bearish_cross = prv_m > prv_s and cur_m <= cur_s

        result.update(
            {
                "macd": round(cur_m, 4),
                "signal": round(cur_s, 4),
                "histogram": round(cur_h, 4),
                "above_signal": cur_m > cur_s,
                "bullish_cross": bool(bullish_cross),
                "bearish_cross": bool(bearish_cross),
                "histogram_expanding": abs(cur_h) > abs(prv_h),
                "bias": "BULLISH" if cur_m > cur_s else "BEARISH",
                "status": "success",
            }
        )

        if bullish_cross:
            logger.info("MACD bullish crossover detected")
        if bearish_cross:
            logger.info("MACD bearish crossover detected")

        logger.debug(
            f"MACD computed | macd={cur_m:.4f} signal={cur_s:.4f} " f"hist={cur_h:.4f}"
        )

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"MACD computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_bollinger(df: pd.DataFrame) -> dict[str, Any]:
    """
    Compute Bollinger Bands (20, 2σ) with bandwidth / squeeze / breakout signals.
    """

    logger.debug("Computing Bollinger Bands (20, 2σ)")

    result = {
        "upper": None,
        "mid": None,
        "lower": None,
        "bandwidth_pct": None,
        "percent_b": None,
        "bandwidth_trend": None,
        "squeeze_active": None,
        "breakout_up": None,
        "breakout_down": None,
        "upside_to_upper_pct": None,
        "downside_to_lower_pct": None,
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty:
            result["error"] = "empty_dataframe"
            return result

        if "Close" not in df:
            result["error"] = "missing_close_column"
            return result

        close = df["Close"]

        if len(close) < 20:
            result["error"] = "insufficient_data_for_bollinger"
            return result

        bb = ta.volatility.BollingerBands(close)

        ub_series = bb.bollinger_hband()
        mid_series = bb.bollinger_mavg()
        lb_series = bb.bollinger_lband()

        if ub_series.isna().all():
            result["error"] = "bollinger_all_nan"
            return result

        price = float(close.iloc[-1])

        ub = float(ub_series.iloc[-1])
        mid = float(mid_series.iloc[-1])
        lb = float(lb_series.iloc[-1])

        # --- safe division guards ---
        band_width = ub - lb
        bw = (band_width / mid * 100) if mid else 0

        pct_b = (price - lb) / band_width if band_width != 0 else 0.5

        bw_series = (ub_series - lb_series) / mid_series * 100

        bw_ma10 = (
            float(bw_series.rolling(10).mean().iloc[-1]) if len(bw_series) >= 10 else bw
        )
        bw_q20 = (
            float(bw_series.rolling(20).quantile(0.20).iloc[-1])
            if len(bw_series) >= 20
            else bw
        )

        # --- volume safety ---
        if "Volume" in df and len(df["Volume"]) >= 20:
            vol_avg20 = float(df["Volume"].rolling(20).mean().iloc[-1])
            vol_surge = float(df["Volume"].iloc[-1]) > vol_avg20 * 1.5
        else:
            vol_surge = False

        squeeze_active = bw < bw_q20
        breakout_up = price > ub and vol_surge
        breakout_down = price < lb and vol_surge

        bw_trend = "EXPANDING" if bw > bw_ma10 else "CONTRACTING"

        result.update(
            {
                "upper": round(ub, 2),
                "mid": round(mid, 2),
                "lower": round(lb, 2),
                "bandwidth_pct": round(bw, 2),
                "percent_b": round(pct_b, 3),
                "bandwidth_trend": bw_trend,
                "squeeze_active": bool(squeeze_active),
                "breakout_up": bool(breakout_up),
                "breakout_down": bool(breakout_down),
                "upside_to_upper_pct": (
                    round((ub - price) / price * 100, 2) if price else None
                ),
                "downside_to_lower_pct": (
                    round((price - lb) / price * 100, 2) if price else None
                ),
                "status": "success",
            }
        )

        # --- logs ---
        logger.debug(
            f"Bollinger computed | bw={bw:.2f}% trend={bw_trend} pct_b={pct_b:.3f}"
        )

        if squeeze_active:
            logger.info(f"Bollinger squeeze active | bw={bw:.2f}%")
        if breakout_up:
            logger.info(f"Bollinger breakout UP | price={price}")
        if breakout_down:
            logger.info(f"Bollinger breakout DOWN | price={price}")

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"Bollinger computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_atr(df: pd.DataFrame, window: int = 14) -> dict[str, Any]:
    """
    Compute ATR and classify volatility regime.

    """

    logger.debug(f"Computing ATR | window={window}")

    result = {
        "value": None,
        "atr_pct": None,
        "volatility": None,
        "daily_move_range": None,
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty:
            result["error"] = "empty_dataframe"
            return result

        required_cols = {"High", "Low", "Close"}
        if not required_cols.issubset(df.columns):
            result["error"] = "missing_required_columns"
            return result

        if len(df) < window + 1:
            result["error"] = "insufficient_data_for_atr"
            return result

        atr_series = ta.volatility.AverageTrueRange(
            df["High"], df["Low"], df["Close"], window=window
        ).average_true_range()

        if atr_series.isna().all():
            result["error"] = "atr_all_nan"
            return result

        atr_val = float(atr_series.iloc[-1])
        price = float(df["Close"].iloc[-1])

        if price == 0:
            result["error"] = "invalid_price_zero"
            return result

        atr_pct = (atr_val / price) * 100

        # volatility regime
        if atr_pct > 2:
            volatility = "HIGH"
        elif atr_pct > 1:
            volatility = "MODERATE"
        else:
            volatility = "LOW"

        result.update(
            {
                "value": round(atr_val, 2),
                "atr_pct": round(atr_pct, 2),
                "volatility": volatility,
                "daily_move_range": {
                    "low": round(price - atr_val, 2),
                    "high": round(price + atr_val, 2),
                },
                "status": "success",
            }
        )

        logger.debug(
            f"ATR computed | value={atr_val:.2f} atr_pct={atr_pct:.2f}% "
            f"volatility={volatility}"
        )

        if volatility == "HIGH":
            logger.warning(f"HIGH volatility detected | ATR={atr_pct:.2f}%")

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"ATR computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_vwma(df: pd.DataFrame, window: int = 20) -> dict[str, Any]:
    """
    Compute Volume-Weighted Moving Average (VWMA).
    """

    logger.debug(f"Computing VWMA | window={window}")

    result = {
        "value": None,
        "price_vs_vwma": None,
        "signal": None,
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty:
            result["error"] = "empty_dataframe"
            return result

        required_cols = {"Close", "Volume"}
        if not required_cols.issubset(df.columns):
            result["error"] = "missing_required_columns"
            return result

        if len(df) < window:
            result["error"] = "insufficient_data_for_vwma"
            return result

        volume_sum = df["Volume"].rolling(window).sum()
        price_vol_sum = (df["Close"] * df["Volume"]).rolling(window).sum()

        if volume_sum.isna().all() or volume_sum.iloc[-1] == 0:
            result["error"] = "invalid_volume_data"
            return result

        vwma_series = price_vol_sum / volume_sum

        vwma_val = float(vwma_series.iloc[-1])
        price = float(df["Close"].iloc[-1])

        pos = "ABOVE" if price > vwma_val else "BELOW"

        result.update(
            {
                "value": round(vwma_val, 2),
                "price_vs_vwma": pos,
                "signal": "BULLISH" if pos == "ABOVE" else "BEARISH",
                "status": "success",
            }
        )

        logger.debug(
            f"VWMA computed | vwma={vwma_val:.2f} price={price:.2f} position={pos}"
        )

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"VWMA computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_mfi(df: pd.DataFrame, window: int = 14) -> dict[str, Any]:
    """
    Compute Money Flow Index (MFI), a volume-weighted RSI.
    """

    logger.debug(f"Computing MFI | window={window}")

    result = {
        "value": None,
        "condition": None,
        "signal": None,
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty:
            result["error"] = "empty_dataframe"
            return result

        required_cols = {"High", "Low", "Close", "Volume"}
        if not required_cols.issubset(df.columns):
            result["error"] = "missing_required_columns"
            return result

        if len(df) < window + 1:
            result["error"] = "insufficient_data_for_mfi"
            return result

        mfi_series = ta.volume.MFIIndicator(
            high=df["High"],
            low=df["Low"],
            close=df["Close"],
            volume=df["Volume"],
            window=window,
        ).money_flow_index()

        if mfi_series.isna().all():
            result["error"] = "mfi_all_nan"
            return result

        mfi_val = float(mfi_series.iloc[-1])

        condition, signal = _compute_mfi_condition_signal(mfi_val)

        result.update(
            {
                "value": round(mfi_val, 2),
                "condition": condition,
                "signal": signal,
                "status": "success",
            }
        )

        if condition in ("OVERBOUGHT", "OVERSOLD"):
            logger.warning(
                f"MFI extreme zone | condition={condition} value={mfi_val:.2f}"
            )

        logger.debug(f"MFI computed | value={mfi_val:.2f} condition={condition}")

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"MFI computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


def compute_volume(df: pd.DataFrame) -> dict[str, Any]:
    """
    Volume metrics designed for agentic workflows.
    """

    logger.debug("Computing volume metrics")

    result = {
        "latest": None,
        "avg_20d": None,
        "ratio_5d_20d": None,
        "surge": None,
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty:
            result["error"] = "empty_dataframe"
            return result

        if "Volume" not in df.columns:
            result["error"] = "missing_volume_column"
            return result

        volume = df["Volume"]

        if len(volume) < 20:
            result["error"] = "insufficient_data_for_volume_metrics"
            return result

        latest = int(volume.iloc[-1])

        avg20 = float(volume.rolling(20).mean().iloc[-1])

        # safe 5-day handling
        if len(volume) >= 5:
            avg5 = float(volume.iloc[-5:].mean())
        else:
            avg5 = float(volume.mean())

        ratio = (avg5 / avg20) if avg20 else None

        surge = bool(avg20 and avg5 > avg20 * 1.5)

        result.update(
            {
                "latest": latest,
                "avg_20d": round(avg20, 2),
                "ratio_5d_20d": round(ratio, 2) if ratio is not None else None,
                "surge": surge,
                "status": "success",
            }
        )

        logger.debug(
            f"Volume computed | latest={latest} avg20={avg20:.2f} "
            f"ratio={ratio} surge={surge}"
        )

        if surge:
            logger.info(f"Volume surge detected | ratio={ratio:.2f}")

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"Volume computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


FACTOR_WEIGHTS: dict[str, float] = {
    "50D_SWING_LOW": 1.0,
    "50D_SWING_HIGH": 1.0,
    "20D_SWING_LOW": 0.9,
    "20D_SWING_HIGH": 0.9,
    "FIB_61_8": 1.0,
    "FIB_50_0": 0.8,
    "FIB_38_2": 0.7,
    "FIB_23_6": 0.6,
    "FIB_78_6": 0.7,
    "FIB_EXT_127_2": 0.8,
    "FIB_EXT_161_8": 0.9,
    "SMA_20": 0.7,
    "SMA_50": 0.8,
    "SMA_200": 1.0,
    "HISTORICAL_BOUNCE": 0.8,
}


def compute_price_levels(df: pd.DataFrame) -> dict[str, Any]:
    """
    Institutional Support & Resistance Confluence Engine.
    Combines:
      - 20D/50D structural extremes & swing direction detection (UP_SWING vs DOWN_SWING)
      - Direction-aware Fibonacci retracements & breakout/breakdown extensions
      - Key Moving Averages (20, 50, 200 DMA)
      - Deterministic historical bounce touches (>= 0.75 ATR moves)
      - Dynamic ATR-calibrated volatility filtering and zone clustering
      - Confluence scoring & distance-based S1/S2 and R1/R2 selection
      - Volatility-buffered market structure classification
    """

    logger.debug("Computing price levels with confluence engine")

    result = {
        "current": None,
        "high_52w": None,
        "low_52w": None,
        "pct_from_52w_high": None,
        "pct_from_52w_low": None,
        "rs_20d_pct": None,
        "support_1": None,
        "support_2": None,
        "resistance_1": None,
        "resistance_2": None,
        "supports": [],
        "resistances": [],
        "market_structure": "RANGE",
        "swing_context": {},
        "fibonacci_levels": {},
        "status": "failed",
        "error": None,
    }

    try:
        if df is None or df.empty:
            result["error"] = "empty_dataframe"
            return result

        if "Close" not in df.columns:
            result["error"] = "missing_close_column"
            return result

        close = df["Close"].dropna()

        if len(close) < 20:
            result["error"] = "insufficient_data_for_price_levels"
            return result

        price = float(close.iloc[-1])

        # --- 1. 52-week logic (guarded) ---
        lookback_52w = min(252, len(close))
        window_52w = close.tail(lookback_52w)
        window_52w_high = (
            df["High"].tail(lookback_52w) if "High" in df.columns else window_52w
        )
        window_52w_low = (
            df["Low"].tail(lookback_52w) if "Low" in df.columns else window_52w
        )

        h52 = float(window_52w_high.max())
        l52 = float(window_52w_low.min())

        pct_from_high = ((price / h52) - 1) * 100 if h52 else None
        pct_from_low = ((price / l52) - 1) * 100 if l52 else None

        # --- 2. 20-day return (safe) ---
        if len(close) >= 20:
            rs_20d = ((price / float(close.iloc[-20])) - 1) * 100
        else:
            rs_20d = None

        # --- 3. ATR Volatility Calibration ---
        atr = None
        if {"High", "Low", "Close"}.issubset(df.columns) and len(df) >= 15:
            try:
                atr_series = ta.volatility.AverageTrueRange(
                    df["High"], df["Low"], df["Close"], window=14
                ).average_true_range()
                if not atr_series.isna().all():
                    last_atr = float(atr_series.iloc[-1])
                    if last_atr > 0:
                        atr = last_atr
            except Exception:
                atr = None

        if atr is None or atr <= 0:
            atr = max(price * 0.02, 1.0)  # Safe 2% volatility fallback

        distance_threshold = max(price * 0.005, atr * 0.25)
        cluster_tolerance = max(price * 0.008, atr * 0.50)

        # --- 4. 20D & 50D Structural Swings ---
        lookback_50 = min(50, len(df))
        lookback_20 = min(20, len(df))
        w50 = df.tail(lookback_50)
        w20 = df.tail(lookback_20)

        h50 = (
            float(w50["High"].max())
            if "High" in w50.columns
            else float(close.tail(lookback_50).max())
        )
        l50 = (
            float(w50["Low"].min())
            if "Low" in w50.columns
            else float(close.tail(lookback_50).min())
        )
        h20 = (
            float(w20["High"].max())
            if "High" in w20.columns
            else float(close.tail(lookback_20).max())
        )
        l20 = (
            float(w20["Low"].min())
            if "Low" in w20.columns
            else float(close.tail(lookback_20).min())
        )

        # Determine swing direction by checking whether 50D high was reached after 50D low
        if "High" in w50.columns and "Low" in w50.columns:
            high_idx = w50["High"].idxmax()
            low_idx = w50["Low"].idxmin()
            high_pos = w50.index.get_loc(high_idx)
            low_pos = w50.index.get_loc(low_idx)
            swing_direction = "UP_SWING" if high_pos >= low_pos else "DOWN_SWING"
            high_date = (
                str(high_idx.date()) if hasattr(high_idx, "date") else str(high_idx)
            )
            low_date = str(low_idx.date()) if hasattr(low_idx, "date") else str(low_idx)
        else:
            swing_direction = (
                "UP_SWING" if price >= (l50 + (h50 - l50) / 2) else "DOWN_SWING"
            )
            high_date = None
            low_date = None

        swing_range = max(h50 - l50, 0.0)
        swing_context = {
            "direction": swing_direction,
            "swing_high": round(h50, 2),
            "swing_low": round(l50, 2),
            "high_date": high_date,
            "low_date": low_date,
            "swing_range": round(swing_range, 2),
        }

        # --- 5. Direction-Aware Fibonacci Calculation ---
        fib_levels = {}
        candidates: list[dict[str, Any]] = []

        if swing_range > 0:
            if swing_direction == "UP_SWING":
                # Retracements pull back downwards from high
                f236 = h50 - 0.236 * swing_range
                f382 = h50 - 0.382 * swing_range
                f500 = h50 - 0.500 * swing_range
                f618 = h50 - 0.618 * swing_range
                f786 = h50 - 0.786 * swing_range
                # Extensions project above high for breakouts
                ext1272 = l50 + 1.272 * swing_range
                ext1618 = l50 + 1.618 * swing_range
            else:
                # Retracements bounce upwards from low
                f236 = l50 + 0.236 * swing_range
                f382 = l50 + 0.382 * swing_range
                f500 = l50 + 0.500 * swing_range
                f618 = l50 + 0.618 * swing_range
                f786 = l50 + 0.786 * swing_range
                # Extensions project below low for breakdowns
                ext1272 = h50 - 1.272 * swing_range
                ext1618 = h50 - 1.618 * swing_range

            fib_levels = {
                "fib_23_6": round(f236, 2),
                "fib_38_2": round(f382, 2),
                "fib_50_0": round(f500, 2),
                "fib_61_8": round(f618, 2),
                "fib_78_6": round(f786, 2),
                "fib_ext_127_2": round(ext1272, 2),
                "fib_ext_161_8": round(ext1618, 2),
            }

            fib_items = [
                ("FIB_23_6", f236),
                ("FIB_38_2", f382),
                ("FIB_50_0", f500),
                ("FIB_61_8", f618),
                ("FIB_78_6", f786),
                ("FIB_EXT_127_2", ext1272),
                ("FIB_EXT_161_8", ext1618),
            ]
            for factor, lvl in fib_items:
                candidates.append(
                    {
                        "level": float(lvl),
                        "factor": factor,
                        "source": "fibonacci",
                        "weight": FACTOR_WEIGHTS.get(factor, 0.7),
                    }
                )

        # --- 6. Structural Swings & Moving Averages Candidates ---
        candidates.append(
            {
                "level": float(h50),
                "factor": "50D_SWING_HIGH",
                "source": "market_structure",
                "weight": FACTOR_WEIGHTS["50D_SWING_HIGH"],
            }
        )
        candidates.append(
            {
                "level": float(l50),
                "factor": "50D_SWING_LOW",
                "source": "market_structure",
                "weight": FACTOR_WEIGHTS["50D_SWING_LOW"],
            }
        )
        candidates.append(
            {
                "level": float(h20),
                "factor": "20D_SWING_HIGH",
                "source": "market_structure",
                "weight": FACTOR_WEIGHTS["20D_SWING_HIGH"],
            }
        )
        candidates.append(
            {
                "level": float(l20),
                "factor": "20D_SWING_LOW",
                "source": "market_structure",
                "weight": FACTOR_WEIGHTS["20D_SWING_LOW"],
            }
        )

        for w, factor in [(20, "SMA_20"), (50, "SMA_50"), (200, "SMA_200")]:
            if len(close) >= w:
                ma_val = close.rolling(w).mean().iloc[-1]
                if not pd.isna(ma_val):
                    candidates.append(
                        {
                            "level": float(ma_val),
                            "factor": factor,
                            "source": "moving_average",
                            "weight": FACTOR_WEIGHTS.get(factor, 0.8),
                        }
                    )

        # --- 7. Historical Price Reaction Bounces (>= 0.75 ATR) ---
        if {"High", "Low"}.issubset(w50.columns) and len(w50) >= 7:
            lows = w50["Low"].values
            highs = w50["High"].values
            n = len(w50)
            # Local swing valley with bounce reaction
            for i in range(1, n - 3):
                if lows[i] < lows[i - 1] and lows[i] < lows[i + 1]:
                    max_subsequent = highs[i + 1 : min(i + 4, n)].max()
                    if max_subsequent - lows[i] >= 0.75 * atr:
                        candidates.append(
                            {
                                "level": float(lows[i]),
                                "factor": "HISTORICAL_BOUNCE",
                                "source": "price_action",
                                "weight": FACTOR_WEIGHTS["HISTORICAL_BOUNCE"],
                            }
                        )
            # Local swing peak with rejection reaction
            for i in range(1, n - 3):
                if highs[i] > highs[i - 1] and highs[i] > highs[i + 1]:
                    min_subsequent = lows[i + 1 : min(i + 4, n)].min()
                    if highs[i] - min_subsequent >= 0.75 * atr:
                        candidates.append(
                            {
                                "level": float(highs[i]),
                                "factor": "HISTORICAL_BOUNCE",
                                "source": "price_action",
                                "weight": FACTOR_WEIGHTS["HISTORICAL_BOUNCE"],
                            }
                        )

        # --- 8. Cluster Candidates into Confluence Zones ---
        sorted_candidates = sorted(candidates, key=lambda c: c["level"])
        clusters: list[list[dict[str, Any]]] = []

        for cand in sorted_candidates:
            if not clusters:
                clusters.append([cand])
            else:
                current_cluster = clusters[-1]
                cluster_min = min(c["level"] for c in current_cluster)
                if cand["level"] - cluster_min <= cluster_tolerance:
                    current_cluster.append(cand)
                else:
                    clusters.append([cand])

        zones = []
        for cl in clusters:
            levels = [c["level"] for c in cl]
            low_zone = round(min(levels), 2)
            high_zone = round(max(levels), 2)
            center_lvl = round(sum(levels) / len(levels), 2)

            # Deduplicate factors to prevent artificial score inflation
            unique_factors_dict: dict[str, float] = {}
            for c in cl:
                f = c["factor"]
                if f not in unique_factors_dict or c["weight"] > unique_factors_dict[f]:
                    unique_factors_dict[f] = c["weight"]

            unique_factors = list(unique_factors_dict.keys())
            confluence_score = round(sum(unique_factors_dict.values()), 2)
            confluence_count = len(unique_factors)

            if confluence_score >= 2.5:
                strength = "HIGH"
            elif confluence_score >= 1.5:
                strength = "MEDIUM"
            else:
                strength = "LOW"

            zones.append(
                {
                    "center": center_lvl,
                    "zone": {
                        "low": low_zone,
                        "high": high_zone,
                    },
                    "confluence_factors": unique_factors,
                    "confluence_count": confluence_count,
                    "confluence_score": confluence_score,
                    "strength": strength,
                }
            )

        # --- 9. Distance-Based Support & Resistance Selection ---
        # Supports: strictly below (price - distance_threshold), sorted DESCENDING by distance to price
        supports = [z for z in zones if z["center"] < price - distance_threshold]
        supports.sort(key=lambda z: z["center"], reverse=True)

        # Resistances: strictly above (price + distance_threshold), sorted ASCENDING by distance to price
        resistances = [z for z in zones if z["center"] > price + distance_threshold]
        resistances.sort(key=lambda z: z["center"])

        s1 = supports[0] if len(supports) > 0 else None
        s2 = supports[1] if len(supports) > 1 else None
        r1 = resistances[0] if len(resistances) > 0 else None
        r2 = resistances[1] if len(resistances) > 1 else None

        # --- 10. Volatility-Buffered Market Structure Determination ---
        prior_52w_h = (
            window_52w_high.iloc[:-1] if len(window_52w_high) > 1 else window_52w_high
        )
        prior_52w_l = (
            window_52w_low.iloc[:-1] if len(window_52w_low) > 1 else window_52w_low
        )
        prior_h52 = float(prior_52w_h.max())
        prior_l52 = float(prior_52w_l.min())

        breakout_threshold = max(price * 0.005, atr * 0.25)
        if price > prior_h52 + breakout_threshold:
            market_structure = "BREAKOUT"
        elif price < prior_l52 - breakout_threshold:
            market_structure = "BREAKDOWN"
        else:
            ma50 = close.rolling(50).mean().iloc[-1] if len(close) >= 50 else None
            if (
                ma50
                and not pd.isna(ma50)
                and price > ma50
                and swing_direction == "UP_SWING"
            ):
                market_structure = "UPTREND"
            elif (
                ma50
                and not pd.isna(ma50)
                and price < ma50
                and swing_direction == "DOWN_SWING"
            ):
                market_structure = "DOWNTREND"
            else:
                market_structure = "RANGE"

        result.update(
            {
                "current": round(price, 2),
                "high_52w": round(h52, 2),
                "low_52w": round(l52, 2),
                "pct_from_52w_high": (
                    round(pct_from_high, 2) if pct_from_high is not None else None
                ),
                "pct_from_52w_low": (
                    round(pct_from_low, 2) if pct_from_low is not None else None
                ),
                "rs_20d_pct": round(rs_20d, 2) if rs_20d is not None else None,
                "support_1": s1["center"] if s1 else None,
                "support_2": s2["center"] if s2 else None,
                "resistance_1": r1["center"] if r1 else None,
                "resistance_2": r2["center"] if r2 else None,
                "supports": supports,
                "resistances": resistances,
                "market_structure": market_structure,
                "swing_context": swing_context,
                "fibonacci_levels": fib_levels,
                "status": "success",
            }
        )

        logger.debug(
            f"Price levels computed | current={price:.2f} S1={result['support_1']} "
            f"R1={result['resistance_1']} structure={market_structure}"
        )

        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result

    except Exception as exc:
        logger.exception(f"Price level computation failed: {exc}")
        result["error"] = str(exc)
        result["status"] = "failed"
        result["missing_fields"] = [
            k
            for k, v in result.items()
            if v is None and k not in ("error", "missing_fields")
        ]
        return result


# The following code is for testing and demonstration purposes only
@with_retry(retries=3, delay=2.0, backoff=2.0)
def fetch_df(ticker: str, period: str = "1y", interval: str = "1d") -> dict[str, Any]:
    """Fetch historical OHLCV data safely for agent pipelines."""

    logger.debug(f"Downloading OHLCV data | ticker={ticker}")

    result = {
        "data": None,
        "status": "failed",
        "error": None,
        "ticker": ticker,
        "source": "yfinance",
    }
    try:
        with yf_call("fetch_df"):
            df = yf.download(
                ticker,
                period=period,
                interval=interval,
                auto_adjust=True,
                progress=False,
            )
    except YFinance401Error as e:
        result["error"] = f"401_unauthorized | caller='{e.caller}'"
        return result
    except Exception as exc:
        logger.exception(f"yfinance.download failed | ticker={ticker} | {exc}")
        result["error"] = f"download_failed: {exc}"
        return result

    # Initial empty check
    if df is None or df.empty:
        logger.warning(f"Empty DataFrame | ticker={ticker}")
        result["error"] = "empty_dataframe"
        return result

    try:
        # Remove rows with NaN values
        df = df.dropna(how="any")

        # Check again after cleaning
        if df.empty:
            logger.warning(f"DataFrame empty after dropna | ticker={ticker}")
            result["error"] = "empty_after_dropna"
            return result

        df.index = pd.to_datetime(df.index).tz_localize(None)
        df.sort_index(inplace=True)

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

    except Exception as exc:
        logger.exception(f"Normalization failed | ticker={ticker} | {exc}")
        result["error"] = f"parse_error: {exc}"
        result["data"] = df
        result["status"] = "partial"
        return result

    logger.info(f"Fetched {len(df)} bars | ticker={ticker}")

    result["data"] = df
    result["status"] = "success"
    return result


if __name__ == "__main__":

    print("Fetching technical snapshot \n")
    ticker = "HINDUNILVR.NS"
    df = fetch_df(ticker)
    print(df["data"])
    print(f"Data fetch status: {df['status']}")
    snapshot = {
        "ticker": ticker,
        "price_levels": compute_price_levels(df["data"]),
        "moving_averages": compute_moving_averages(df["data"]),
        "rsi": compute_rsi(df["data"]),
        "macd": compute_macd(df["data"]),
        "bollinger": compute_bollinger(df["data"]),
        "atr": compute_atr(df["data"]),
        "vwma": compute_vwma(df["data"]),
        "mfi": compute_mfi(df["data"]),
        "volume": compute_volume(df["data"]),
    }
    output = json.dumps(snapshot, indent=2)
    print(output)

    with open("technical_snapshot.json", "w") as f:
        f.write(output)

    print("\nSaved : technical_snapshot.json")
