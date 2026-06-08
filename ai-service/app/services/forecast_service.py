"""Leave demand forecasting — ML model with statistical fallback."""
from __future__ import annotations

import logging
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "leave_forecast_model.pkl"

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


def _is_eid(d: datetime) -> int:
    m, day = d.month, d.day
    return 1 if (m == 4 and 8 <= day <= 13) or (m == 6 and 15 <= day <= 20) else 0


def _is_ramadan(d: datetime) -> int:
    m, day = d.month, d.day
    return 1 if (m == 3 and day >= 11) or (m == 4 and day <= 9) else 0


def _build_feature_vector(d: datetime, rolling_avg: float) -> list[float]:
    dow = d.weekday()
    month = d.month
    week = d.isocalendar()[1]
    return [
        dow, month, week,
        1 if dow >= 5 else 0,
        0,                                   # isPublicHoliday
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

    rolling_avg = 2.5
    forecast = []

    for i in range(30):
        d = today + timedelta(days=i)
        dow = d.weekday()

        if use_ml:
            fv = _build_feature_vector(d, rolling_avg)
            try:
                raw = float(model.predict([fv])[0])
                predicted = round(max(0, raw), 1)
            except Exception:
                predicted = round(2.5 * DAY_WEIGHTS.get(dow, 1.0) * MONTH_WEIGHTS.get(d.month, 1.0), 1)
        else:
            predicted = round(2.5 * DAY_WEIGHTS.get(dow, 1.0) * MONTH_WEIGHTS.get(d.month, 1.0), 1)

        rolling_avg = round((rolling_avg * 6 + predicted) / 7, 2)

        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "predicted": predicted,
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
    }
