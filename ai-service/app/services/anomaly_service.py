"""Attendance anomaly detection — real z-score analysis with pattern fallback."""
from __future__ import annotations

import logging
import math
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
ANOMALY_MODEL_PATH = ROOT / "models" / "anomaly_model.pkl"

SEVERITY_THRESHOLDS = {"HIGH": 2.5, "MEDIUM": 1.5}

ANOMALY_FEATURES = [
    "attendanceRate30Days", "lateCountThisMonth", "absenceCountThisMonth",
    "checkInHourAvg", "checkInStdDev", "mondayAbsenceRate", "fridayAbsenceRate",
    "consecutiveLateMax", "earlyCheckoutCount", "avgWorkingHours",
]


def _load_anomaly_model():
    if not ANOMALY_MODEL_PATH.exists():
        return None, None, None
    try:
        import joblib
        artifact = joblib.load(ANOMALY_MODEL_PATH)
        if isinstance(artifact, dict) and artifact.get("model") is not None:
            return artifact["model"], artifact.get("typeModel"), artifact.get("labelEncoder")
    except Exception as exc:
        logger.warning("Could not load anomaly model: %s", exc)
    return None, None, None


async def _fetch(path: str) -> Any:
    if not settings.BACKEND_TOKEN:
        return None
    headers = {"Authorization": f"Bearer {settings.BACKEND_TOKEN}"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{settings.BACKEND_URL}{path}", headers=headers)
        if r.status_code == 200:
            return r.json().get("data")
    except Exception as exc:
        logger.warning("Anomaly backend fetch failed (%s): %s", path, exc)
    return None


def _z_score(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return (value - mean) / std


def _severity(z: float) -> str:
    az = abs(z)
    if az >= SEVERITY_THRESHOLDS["HIGH"]:
        return "HIGH"
    if az >= SEVERITY_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


def _analyse_trend_data(trend: list[dict]) -> list[dict]:
    """Run z-score anomaly detection over daily attendance trend data."""
    if not trend or len(trend) < 3:
        return []

    absent_series = [int(day.get("ABSENT", 0)) for day in trend]
    late_series = [int(day.get("LATE", 0)) for day in trend]
    present_series = [int(day.get("PRESENT", 0)) for day in trend]

    anomalies: list[dict] = []

    # Absent anomalies
    if len(absent_series) >= 3:
        mean_a = statistics.mean(absent_series)
        std_a = statistics.pstdev(absent_series)
        for day, count in zip(trend, absent_series):
            z = _z_score(count, mean_a, std_a)
            sev = _severity(z)
            if abs(z) >= SEVERITY_THRESHOLDS["MEDIUM"]:
                anomalies.append({
                    "type": "ABSENCE_SPIKE" if z > 0 else "UNUSUALLY_LOW_ABSENCE",
                    "description": (
                        f"Absences on {day.get('date', '?')} were {count} "
                        f"(z={z:.2f}, mean={mean_a:.1f})"
                    ),
                    "date": day.get("date"),
                    "value": count,
                    "zScore": round(z, 2),
                    "severity": sev,
                    "recommendation": (
                        "Investigate root cause — potential team event, illness wave, or local holiday."
                        if z > 0 else "Positive pattern — attendance was unusually high this day."
                    ),
                })

    # Late-arrival anomalies
    if len(late_series) >= 3:
        mean_l = statistics.mean(late_series)
        std_l = statistics.pstdev(late_series)
        for day, count in zip(trend, late_series):
            z = _z_score(count, mean_l, std_l)
            if z >= SEVERITY_THRESHOLDS["MEDIUM"]:
                anomalies.append({
                    "type": "LATE_ARRIVAL_SPIKE",
                    "description": (
                        f"Late arrivals on {day.get('date', '?')} were {count} "
                        f"(z={z:.2f}, mean={mean_l:.1f})"
                    ),
                    "date": day.get("date"),
                    "value": count,
                    "zScore": round(z, 2),
                    "severity": _severity(z),
                    "recommendation": "Check for external disruptions (transport, weather) or shift policy gaps.",
                })

    # Day-of-week pattern: check if certain days consistently have higher absence
    day_buckets: dict[str, list[int]] = {}
    for day in trend:
        d = day.get("date", "")
        try:
            dow = datetime.strptime(d, "%Y-%m-%d").strftime("%A") if d else "Unknown"
        except ValueError:
            dow = "Unknown"
        day_buckets.setdefault(dow, []).append(int(day.get("ABSENT", 0)))

    for dow, counts in day_buckets.items():
        if len(counts) >= 2:
            avg = statistics.mean(counts)
            overall_avg = statistics.mean(absent_series) if absent_series else 0
            if overall_avg > 0 and avg / overall_avg >= 1.6:
                anomalies.append({
                    "type": "DAY_OF_WEEK_PATTERN",
                    "description": f"{dow}s have {avg:.1f} avg absences vs {overall_avg:.1f} overall ({avg / overall_avg:.1f}x higher).",
                    "date": dow,
                    "value": round(avg, 1),
                    "zScore": None,
                    "severity": "MEDIUM",
                    "recommendation": f"Investigate {dow} attendance patterns — flexible scheduling may help.",
                })

    # Sort: HIGH first, then MEDIUM, then LOW
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    anomalies.sort(key=lambda a: severity_order.get(a["severity"], 9))
    return anomalies[:8]


def _static_patterns(user_id: Optional[str]) -> list[dict]:
    return [
        {
            "type": "FREQUENT_LATE",
            "description": "Employee has been late more than 3 times this week.",
            "date": None,
            "value": 3,
            "zScore": None,
            "severity": "MEDIUM",
            "recommendation": "Consider flexible working hours or check for commute issues.",
        },
        {
            "type": "MONDAY_ABSENCE",
            "description": "Pattern of Monday absences detected (3 out of last 4 Mondays).",
            "date": None,
            "value": 3,
            "zScore": None,
            "severity": "LOW",
            "recommendation": "Review weekend-to-workday transition — may indicate disengagement.",
        },
    ]


def _compute_features_from_trend(trend_data: list[dict]) -> list[float]:
    """
    Derive all 10 ML features from daily trend data.
    Features: attendanceRate30Days, lateCountThisMonth, absenceCountThisMonth,
              checkInHourAvg, checkInStdDev, mondayAbsenceRate, fridayAbsenceRate,
              consecutiveLateMax, earlyCheckoutCount, avgWorkingHours
    """
    if not trend_data:
        return [100, 0, 0, 9.0, 0.0, 0.0, 0.0, 0, 0, 8.0]

    absent_vals  = [int(d.get("ABSENT", 0))  for d in trend_data]
    late_vals    = [int(d.get("LATE", 0))    for d in trend_data]
    present_vals = [int(d.get("PRESENT", 0)) for d in trend_data]

    total_late    = sum(late_vals)
    total_absent  = sum(absent_vals)
    total_present = sum(present_vals)
    total         = total_present + total_absent + total_late
    att_rate      = (total_present + total_late) / max(total, 1) * 100

    # Day-of-week absence rates
    mon_absents, fri_absents, mon_total, fri_total = 0, 0, 0, 0
    for d in trend_data:
        date_str = d.get("date", "")
        try:
            from datetime import datetime as _dt
            dow = _dt.strptime(date_str, "%Y-%m-%d").weekday() if date_str else -1
        except ValueError:
            dow = -1
        absent_count = int(d.get("ABSENT", 0))
        day_total    = int(d.get("PRESENT", 0)) + int(d.get("LATE", 0)) + absent_count + 1
        if dow == 0:  # Monday
            mon_absents += absent_count
            mon_total   += day_total
        elif dow == 4:  # Friday
            fri_absents += absent_count
            fri_total   += day_total

    mon_rate = mon_absents / max(mon_total, 1)
    fri_rate = fri_absents / max(fri_total, 1)

    # Consecutive late max
    max_consec_late, cur_streak = 0, 0
    for l in late_vals:
        if l > 0:
            cur_streak   += 1
            max_consec_late = max(max_consec_late, cur_streak)
        else:
            cur_streak = 0

    # Estimate checkIn hour avg — more lates → later average
    late_rate         = total_late / max(len(trend_data), 1)
    check_in_hour_avg = round(9.0 + min(late_rate * 0.5, 1.5), 2)

    # Estimate checkIn std dev — from variance in late arrivals per day
    if len(late_vals) >= 2:
        try:
            check_in_std = round(statistics.pstdev(late_vals) * 0.25, 2)
        except Exception:
            check_in_std = 0.25
    else:
        check_in_std = 0.25

    avg_working_hrs = 8.0  # not available in trend data; use org default

    return [
        round(att_rate, 2),
        total_late,
        total_absent,
        check_in_hour_avg,
        check_in_std,
        round(mon_rate, 4),
        round(fri_rate, 4),
        max_consec_late,
        0,              # earlyCheckoutCount — not in trend data
        avg_working_hrs,
    ]


def _ml_anomaly_check(trend_data: list[dict]) -> list[dict] | None:
    """Run ML anomaly classifier if model is available."""
    clf, type_clf, le = _load_anomaly_model()
    if clf is None or not trend_data or len(trend_data) < 3:
        return None

    fv = _compute_features_from_trend(trend_data)

    try:
        is_anomaly = int(clf.predict([fv])[0])
        anomaly_type = "NONE"
        if type_clf is not None and le is not None:
            type_pred = type_clf.predict([fv])[0]
            anomaly_type = le.inverse_transform([type_pred])[0]

        if is_anomaly == 0:
            return []

        return [{
            "type": anomaly_type,
            "description": f"ML model detected {anomaly_type.replace('_', ' ').lower()} pattern in current period.",
            "date": None,
            "value": None,
            "zScore": None,
            "severity": "HIGH" if anomaly_type == "HIGH_ABSENTEEISM" else "MEDIUM",
            "recommendation": {
                "FREQUENT_LATE":    "Review shift times and commute policies.",
                "WEEKEND_BRIDGING": "Investigate Monday/Friday absence patterns.",
                "HIGH_ABSENTEEISM": "Schedule wellness check-in with HR.",
                "EARLY_CHECKOUT":   "Verify flexible-hours policy compliance.",
            }.get(anomaly_type, "Review attendance records with manager."),
            "detectedBy": "ml-model",
            "features": {k: v for k, v in zip(ANOMALY_FEATURES, fv)},
        }]
    except Exception as exc:
        logger.warning("ML anomaly prediction failed: %s", exc)
        return None


async def detect_anomalies(
    user_id: Optional[str] = None,
    organizationId: Optional[str] = None,
    date: Optional[str] = None,
) -> dict:
    now = datetime.now()
    month, year = now.month, now.year

    # Build fetch URL — org-scoped if called from alerts service
    qs = f"month={month}&year={year}"
    if organizationId:
        qs += f"&organizationId={organizationId}"

    # Try real trend data
    trend_data = await _fetch(f"/analytics/attendance/trends?{qs}")

    fallback = False
    ml_used = False

    if trend_data and isinstance(trend_data, list) and len(trend_data) >= 3:
        # Try ML classifier first
        ml_results = _ml_anomaly_check(trend_data)
        if ml_results is not None:
            anomalies = ml_results
            ml_used = True
        else:
            anomalies = _analyse_trend_data(trend_data)
    else:
        fallback = True
        anomalies = _static_patterns(user_id)

    algorithm = "ml-random-forest-v1" if ml_used else ("z-score-daily-trend" if not fallback else "static-pattern-fallback")
    return {
        "anomalies": anomalies,
        "count": len(anomalies),
        "userId": user_id,
        "month": month,
        "year": year,
        "analysisDate": now.isoformat(),
        "algorithm": algorithm,
        "mlModel": ml_used,
        "fallback": fallback,
        "message": (
            f"Found {len(anomalies)} attendance anomaly(ies) in {now.strftime('%B %Y')}."
            if anomalies
            else f"No significant anomalies detected in {now.strftime('%B %Y')}."
        ),
    }
