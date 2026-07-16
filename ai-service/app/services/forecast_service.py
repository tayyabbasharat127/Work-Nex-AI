"""Leave demand forecasting — ML model with statistical fallback."""
from __future__ import annotations

import json
import logging
import os
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx
from app.core.auth import get_current_token

logger = logging.getLogger(__name__)

BACKEND_INTERNAL_URL = os.getenv("BACKEND_URL", "http://localhost:5000/api/v1")

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "leave_forecast_model.pkl"
MODEL_META_PATH = ROOT / "models" / "leave_forecast_model_metadata.json"

DEFAULT_ROLLING_AVG = 2.5

DAY_WEIGHTS   = {0: 1.3, 1: 0.9, 2: 0.8, 3: 0.9, 4: 1.4, 5: 0.3, 6: 0.1}
MONTH_WEIGHTS = {1: 0.85, 2: 0.80, 3: 0.90, 4: 1.00, 5: 1.10, 6: 1.35,
                 7: 1.45, 8: 1.20, 9: 0.95, 10: 0.90, 11: 0.85, 12: 1.40}

FORECAST_FEATURES = [
    "dayOfWeek", "month", "weekOfYear", "isWeekend",
    "isPublicHoliday", "isEidSeason", "isRamadan",
    "isSummer", "isYearEnd", "isMonday", "isFriday",
    "prevWeekDailyAvgLeaves", "rollingAvg14Days",
]


def _load_model():
    if not MODEL_PATH.exists():
        return None
    try:
        import joblib
        artifact = joblib.load(MODEL_PATH)
        if isinstance(artifact, dict) and artifact.get("model") is not None:
            return artifact["model"]
    except Exception as exc:
        logger.warning("Could not load forecast model: %s", exc)
    return None


def _extract_rows(payload) -> list:
    """Backend responses are wrapped as {success, message, data}, not a bare
    list — the array always lives under payload['data']. A previous version
    of this extraction used `payload.get("data") or payload if
    isinstance(payload, list) else []`, which — due to Python's `if/else`
    binding looser than `or` — evaluated to `[] ` whenever payload was a dict
    (i.e. always), silently discarding every response. Kept explicit here to
    avoid repeating that mistake."""
    if isinstance(payload, dict):
        return payload.get("data") or []
    if isinstance(payload, list):
        return payload
    return []


def _load_model_mae() -> float:
    """Model's mean-absolute-error on its held-out test set — used as the
    basis for the forecast's confidence interval. Falls back to a
    conservative 1.0 if metadata is missing (no trained model, or MAE wasn't
    recorded), rather than claiming false precision."""
    try:
        if MODEL_META_PATH.exists():
            meta = json.loads(MODEL_META_PATH.read_text(encoding="utf-8"))
            mae = meta.get("mae")
            if isinstance(mae, (int, float)) and mae > 0:
                return float(mae)
    except Exception as exc:
        logger.debug("Could not read forecast model metadata: %s", exc)
    return 1.0


async def _fetch_recent_leave_history(days: int = 14) -> Optional[float]:
    """Real trailing daily-leave-count average from the org's own history,
    used to seed the rolling-average feature instead of a fixed constant.
    Returns None (caller falls back to DEFAULT_ROLLING_AVG) on any failure —
    same fail-open pattern as _fetch_holiday_dates."""
    try:
        token = get_current_token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(
                f"{BACKEND_INTERNAL_URL}/leave/history/daily-counts",
                params={"days": days},
                headers=headers,
            )
            if r.status_code == 200:
                rows = _extract_rows(r.json())
                counts = [float(row.get("count", 0)) for row in rows if isinstance(row, dict)]
                if counts:
                    return round(statistics.mean(counts), 2)
    except Exception as exc:
        logger.debug("Leave history fetch failed (using default baseline): %s", exc)
    return None


async def _fetch_holiday_dates(start: datetime, end: datetime) -> set[str]:
    """Fetch public holiday dates from backend. Returns a set of 'YYYY-MM-DD' strings."""
    try:
        token = get_current_token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{BACKEND_INTERNAL_URL}/attendance/holidays", headers=headers)
            if r.status_code == 200:
                holidays = _extract_rows(r.json())
                dates: set[str] = set()
                for h in holidays:
                    raw = h.get("date") or h.get("holidayDate") or ""
                    if raw:
                        dates.add(raw[:10])  # keep 'YYYY-MM-DD'
                return dates
    except Exception as exc:
        logger.debug("Holiday fetch failed (using empty set): %s", exc)
    return set()


def _is_eid(d: datetime) -> int:
    m, day = d.month, d.day
    return 1 if (m == 4 and 8 <= day <= 13) or (m == 6 and 15 <= day <= 20) else 0


def _is_ramadan(d: datetime) -> int:
    m, day = d.month, d.day
    return 1 if (m == 3 and day >= 11) or (m == 4 and day <= 9) else 0


def _build_feature_vector(d: datetime, rolling_avg: float, holiday_dates: set[str] | None = None) -> list[float]:
    dow = d.weekday()
    month = d.month
    week = d.isocalendar()[1]
    is_holiday = 1 if (holiday_dates and d.strftime("%Y-%m-%d") in holiday_dates) else 0
    return [
        dow, month, week,
        1 if dow >= 5 else 0,
        is_holiday,                          # isPublicHoliday (real from backend)
        _is_eid(d),
        _is_ramadan(d),
        1 if month in (6, 7, 8) else 0,     # isSummer
        1 if (month == 12 and d.day >= 20) or (month == 1 and d.day <= 5) else 0,
        1 if dow == 0 else 0,               # isMonday
        1 if dow == 4 else 0,               # isFriday
        rolling_avg,                         # prevWeekDailyAvgLeaves
        rolling_avg,                         # rollingAvg14Days
        # monthLeaveFactor removed (was leakage)
    ]


async def generate_leave_forecast(department_id: Optional[str] = None) -> dict:
    today = datetime.now()
    model = _load_model()
    use_ml = model is not None
    algorithm = "ml-gradient-boosting-v1" if use_ml else "statistical-moving-average"
    mae = _load_model_mae()

    # Fetch real public holidays from backend (30-day window)
    end_date = today + timedelta(days=30)
    holiday_dates = await _fetch_holiday_dates(today, end_date)

    # Seed the rolling average from the org's own recent leave history instead
    # of a fixed constant — falls back to DEFAULT_ROLLING_AVG only when no
    # history is reachable (fetch failure), not when history is genuinely zero.
    seeded_avg = await _fetch_recent_leave_history(days=14)
    used_real_history = seeded_avg is not None
    rolling_avg = seeded_avg if used_real_history else DEFAULT_ROLLING_AVG

    forecast = []

    for i in range(30):
        d = today + timedelta(days=i)
        dow = d.weekday()

        if use_ml:
            fv = _build_feature_vector(d, rolling_avg, holiday_dates)
            try:
                raw = float(model.predict([fv])[0])
                predicted = round(max(0, raw), 1)
            except Exception:
                predicted = round(rolling_avg * DAY_WEIGHTS.get(dow, 1.0) * MONTH_WEIGHTS.get(d.month, 1.0), 1)
        else:
            predicted = round(rolling_avg * DAY_WEIGHTS.get(dow, 1.0) * MONTH_WEIGHTS.get(d.month, 1.0), 1)

        rolling_avg = round((rolling_avg * 6 + predicted) / 7, 2)

        # ~95% interval from the model's held-out MAE — an approximation
        # (assumes roughly normal residuals), not a true predictive interval;
        # surfaced via confidenceNote so it isn't presented as more precise
        # than it is.
        low = round(max(0, predicted - 1.96 * mae), 1)
        high = round(predicted + 1.96 * mae, 1)

        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "predicted": predicted,
            "low": low,
            "high": high,
            "dayOfWeek": d.strftime("%A"),
            "riskLevel": "HIGH" if predicted > 4 else "MEDIUM" if predicted > 2 else "LOW",
        })

    predictions = [f["predicted"] for f in forecast]
    peak = max(forecast, key=lambda x: x["predicted"])

    return {
        "forecast": forecast,
        "totalPredicted": int(sum(predictions)),
        "peakDay": peak["date"],
        "peakPredicted": peak["predicted"],
        "avgPerDay": round(statistics.mean(predictions), 1),
        "riskLevel": "HIGH" if statistics.mean(predictions) > 3.5 else "MEDIUM",
        "departmentId": department_id,
        "generatedAt": today.isoformat(),
        "algorithm": algorithm,
        "mlModel": use_ml,
        "baselineSource": "organization-history" if used_real_history else "default-fallback",
        "confidenceNote": (
            f"Shaded range is an approximate 95% interval (±{round(1.96 * mae, 1)} leaves/day), "
            f"based on the model's historical average error ({mae} leaves/day) — not a guaranteed bound."
        ),
    }
