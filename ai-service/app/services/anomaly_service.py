"""Attendance anomaly detection — real z-score analysis with pattern fallback."""
from __future__ import annotations

import logging
import math
import statistics
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SEVERITY_THRESHOLDS = {"HIGH": 2.5, "MEDIUM": 1.5}


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


async def detect_anomalies(user_id: Optional[str] = None) -> dict:
    now = datetime.now()
    month, year = now.month, now.year

    # Try real trend data
    trend_data = await _fetch(
        f"/analytics/attendance/trends?month={month}&year={year}"
    )

    fallback = False
    if trend_data and isinstance(trend_data, list) and len(trend_data) >= 3:
        anomalies = _analyse_trend_data(trend_data)
    else:
        fallback = True
        anomalies = _static_patterns(user_id)

    return {
        "anomalies": anomalies,
        "count": len(anomalies),
        "userId": user_id,
        "month": month,
        "year": year,
        "analysisDate": now.isoformat(),
        "algorithm": "z-score-daily-trend" if not fallback else "static-pattern-fallback",
        "fallback": fallback,
        "message": (
            f"Found {len(anomalies)} attendance anomaly(ies) in {now.strftime('%B %Y')}."
            if anomalies
            else f"No significant anomalies detected in {now.strftime('%B %Y')}."
        ),
    }
