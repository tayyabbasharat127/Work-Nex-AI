"""Employee attrition risk scoring — real backend data with synthetic fallback."""
from __future__ import annotations

import logging
import random
from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RISK_WEIGHTS = {
    "high_absenteeism": 0.30,
    "low_performance": 0.25,
    "excessive_leave": 0.20,
    "tenure_risk": 0.15,
    "late_pattern": 0.10,
}

RECOMMENDATIONS = [
    "Schedule supportive 1-on-1 check-ins for high-risk employees.",
    "Review workload and team dynamics for employees with multiple risk factors.",
    "Validate risk signals against attendance and performance records before acting.",
    "Consider flexible work arrangements for employees with commute-related patterns.",
]


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
        logger.warning("Attrition backend fetch failed (%s): %s", path, exc)
    return None


def _score_employee(record: dict) -> dict:
    """Compute attrition risk score from a real PerformanceRecord."""
    attendance_rate = float(record.get("attendanceScore", 80))
    performance = float(record.get("overallScore", 75))
    leave_days = int(record.get("totalLeaveDays", 0) or 0)
    late_days = int(record.get("lateDays", 0) or 0)

    risk = (
        max(0, 100 - attendance_rate) * RISK_WEIGHTS["high_absenteeism"]
        + max(0, 100 - performance) * RISK_WEIGHTS["low_performance"]
        + min(100, leave_days * 6) * RISK_WEIGHTS["excessive_leave"]
        + min(100, late_days * 8) * RISK_WEIGHTS["late_pattern"]
    )

    factors = []
    if attendance_rate < 78:
        factors.append("high_absenteeism")
    if performance < 70:
        factors.append("low_performance")
    if leave_days > 8:
        factors.append("excessive_leave")
    if late_days > 4:
        factors.append("late_pattern")

    user = record.get("user") or {}
    name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or f"Employee {record.get('userId', '?')}"
    dept = (user.get("department") or {}).get("name", "Unassigned")

    return {
        "name": name,
        "department": dept,
        "riskScore": round(min(100.0, risk), 1),
        "overallScore": round(performance, 1),
        "attendanceRate": round(attendance_rate, 1),
        "factors": factors,
    }


def _synthetic_employee(index: int) -> dict:
    random.seed(datetime.now().strftime("%Y-%m") + str(index))
    attendance_rate = random.uniform(62, 99)
    performance_score = random.uniform(50, 98)
    leave_days = random.randint(0, 16)
    late_days = random.randint(0, 10)
    tenure_months = random.randint(3, 72)

    risk = (
        max(0, 100 - attendance_rate) * RISK_WEIGHTS["high_absenteeism"]
        + max(0, 100 - performance_score) * RISK_WEIGHTS["low_performance"]
        + min(100, leave_days * 6) * RISK_WEIGHTS["excessive_leave"]
        + (30 if tenure_months < 6 else 10 if tenure_months > 48 else 0) * RISK_WEIGHTS["tenure_risk"]
        + min(100, late_days * 8) * RISK_WEIGHTS["late_pattern"]
    )

    factors = []
    if attendance_rate < 78:
        factors.append("high_absenteeism")
    if performance_score < 70:
        factors.append("low_performance")
    if leave_days > 8:
        factors.append("excessive_leave")
    if late_days > 4:
        factors.append("late_pattern")
    if tenure_months < 6 or tenure_months > 48:
        factors.append("tenure_risk")

    return {
        "name": f"Employee {index + 1}",
        "department": ["Engineering", "Operations", "Finance", "HR", "Sales"][index % 5],
        "riskScore": round(min(100.0, risk), 1),
        "overallScore": round(performance_score, 1),
        "attendanceRate": round(attendance_rate, 1),
        "factors": factors,
    }


async def calculate_attrition_risk() -> dict:
    now = datetime.now()
    month, year = now.month, now.year
    fallback = False

    # Try to get real performance data from backend
    perf_data = await _fetch(
        f"/analytics/workforce/headcount"
    )
    # Fetch performance records via ETL logs is not directly available;
    # attempt to get aggregate headcount as a signal
    real_employees: list[dict] = []

    # Try fetching from the performance endpoint
    dept_data = await _fetch(
        f"/analytics/attendance/department?month={month}&year={year}"
    )

    if dept_data and isinstance(dept_data, list) and len(dept_data) > 0:
        # Build risk entries from department-level data
        for dept in dept_data:
            dept_name = dept.get("department", "Unassigned")
            present = int(dept.get("present", 0))
            total = int(dept.get("total", 1))
            rate = float(dept.get("rate", 80))
            absent_count = int(dept.get("absent", 0))

            late_ratio = max(0, (total - present - absent_count) / max(total, 1))
            risk = (
                max(0, 100 - rate) * RISK_WEIGHTS["high_absenteeism"]
                + late_ratio * 100 * RISK_WEIGHTS["late_pattern"]
            )
            factors = []
            if rate < 78:
                factors.append("high_absenteeism")
            if late_ratio > 0.1:
                factors.append("late_pattern")

            real_employees.append({
                "name": dept_name,
                "department": dept_name,
                "riskScore": round(min(100.0, risk), 1),
                "overallScore": round(rate, 1),
                "attendanceRate": round(rate, 1),
                "factors": factors,
                "note": "Department-level aggregate",
            })
    else:
        fallback = True
        real_employees = [_synthetic_employee(i) for i in range(12)]

    employees = sorted(real_employees, key=lambda e: e["riskScore"], reverse=True)
    high_risk = [e for e in employees if e["riskScore"] >= 60]
    medium_risk = [e for e in employees if 30 <= e["riskScore"] < 60]

    return {
        "employees": employees,
        "highRiskCount": len(high_risk),
        "mediumRiskCount": len(medium_risk),
        "totalAnalyzed": len(employees),
        "overallRiskLevel": "HIGH" if len(high_risk) > 2 else "MEDIUM" if high_risk else "LOW",
        "riskFactors": RISK_WEIGHTS,
        "recommendations": RECOMMENDATIONS,
        "generatedAt": now.isoformat(),
        "algorithm": "weighted-risk-department-aggregate" if not fallback else "weighted-risk-synthetic-fallback",
        "fallback": fallback,
        "month": month,
        "year": year,
    }
