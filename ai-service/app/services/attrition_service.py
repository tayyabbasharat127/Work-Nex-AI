"""Employee attrition risk scoring using weighted multi-factor analysis."""
from __future__ import annotations

from datetime import datetime
import random


RISK_FACTORS = {
    "high_absenteeism": 0.30,
    "low_performance": 0.25,
    "excessive_leave": 0.20,
    "tenure_risk": 0.15,
    "late_pattern": 0.10,
}


def _synthetic_employee(index: int) -> dict:
    attendance_rate = random.uniform(62, 99)
    performance_score = random.uniform(50, 98)
    leave_days = random.randint(0, 16)
    late_days = random.randint(0, 10)
    tenure_months = random.randint(3, 72)

    risk_score = (
        (100 - attendance_rate) * RISK_FACTORS["high_absenteeism"]
        + (100 - performance_score) * RISK_FACTORS["low_performance"]
        + min(100, leave_days * 6) * RISK_FACTORS["excessive_leave"]
        + (30 if tenure_months < 6 else 10 if tenure_months > 48 else 0) * RISK_FACTORS["tenure_risk"]
        + min(100, late_days * 8) * RISK_FACTORS["late_pattern"]
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
        "riskScore": round(min(100, risk_score), 1),
        "overallScore": round(performance_score, 1),
        "factors": factors,
    }


async def calculate_attrition_risk() -> dict:
    random.seed(datetime.now().strftime("%Y-%m"))
    employees = [_synthetic_employee(i) for i in range(12)]
    high_risk = [e for e in employees if e["riskScore"] >= 60]
    medium_risk = [e for e in employees if 30 <= e["riskScore"] < 60]

    return {
        "employees": sorted(employees, key=lambda item: item["riskScore"], reverse=True),
        "highRiskCount": len(high_risk),
        "mediumRiskCount": len(medium_risk),
        "totalAnalyzed": len(employees),
        "overallRiskLevel": "HIGH" if len(high_risk) > 3 else "MEDIUM" if high_risk else "LOW",
        "riskFactors": RISK_FACTORS,
        "recommendations": [
            "Review employees with multiple risk factors before taking action.",
            "Use attendance and performance records to validate each risk signal.",
            "Schedule supportive manager check-ins for high-risk employees.",
        ],
        "generatedAt": datetime.now().isoformat(),
        "algorithm": "weighted-risk-scoring-synthetic-fallback",
        "fallback": True,
    }
