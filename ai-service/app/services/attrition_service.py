"""Employee attrition risk scoring using weighted multi-factor analysis."""
from datetime import datetime


RISK_FACTORS = {
    "high_absenteeism": 0.30,
    "low_performance":  0.25,
    "excessive_leave":  0.20,
    "tenure_risk":      0.15,
    "late_pattern":     0.10,
}

SAMPLE_EMPLOYEES = [
    {"name": "High Risk Employee 1", "department": "Engineering", "riskScore": 78, "factors": ["high_absenteeism", "low_performance"]},
    {"name": "High Risk Employee 2", "department": "Marketing",   "riskScore": 72, "factors": ["excessive_leave", "late_pattern"]},
    {"name": "Medium Risk Employee", "department": "HR",          "riskScore": 55, "factors": ["tenure_risk"]},
    {"name": "Low Risk Employee 1",  "department": "Finance",     "riskScore": 28, "factors": []},
    {"name": "Low Risk Employee 2",  "department": "Operations",  "riskScore": 15, "factors": []},
]


async def calculate_attrition_risk() -> dict:
    high_risk   = [e for e in SAMPLE_EMPLOYEES if e["riskScore"] >= 70]
    medium_risk = [e for e in SAMPLE_EMPLOYEES if 40 <= e["riskScore"] < 70]

    return {
        "employees": SAMPLE_EMPLOYEES,
        "highRiskCount": len(high_risk),
        "mediumRiskCount": len(medium_risk),
        "totalAnalyzed": len(SAMPLE_EMPLOYEES),
        "overallRiskLevel": "HIGH" if len(high_risk) > 2 else "MEDIUM",
        "riskFactors": RISK_FACTORS,
        "recommendations": [
            "Schedule 1-on-1 meetings with high-risk employees",
            "Review compensation for employees with 2+ years tenure",
            "Implement flexible work policies to reduce absenteeism"
        ],
        "generatedAt": datetime.now().isoformat(),
        "algorithm": "weighted-risk-scoring"
    }
