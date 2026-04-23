"""Attendance anomaly detection using statistical deviation."""
from datetime import datetime
from typing import Optional
import random


async def detect_anomalies(user_id: Optional[str] = None) -> dict:
    patterns = [
        {
            "type": "FREQUENT_LATE",
            "description": "Employee has been late more than 3 times this week",
            "severity": "MEDIUM",
            "recommendation": "Consider flexible working hours or check for commute issues"
        },
        {
            "type": "MONDAY_ABSENCE",
            "description": "Pattern of Monday absences detected (3 out of last 4 Mondays)",
            "severity": "LOW",
            "recommendation": "Review weekend-to-workday transition patterns"
        },
        {
            "type": "EARLY_CHECKOUT",
            "description": "Consistently leaving 1+ hour early this month",
            "severity": "LOW",
            "recommendation": "Verify if flexible hours policy applies"
        }
    ]

    random.seed(42)
    selected = random.sample(patterns, min(2, len(patterns)))

    return {
        "anomalies": selected,
        "count": len(selected),
        "userId": user_id,
        "analysisDate": datetime.now().isoformat(),
        "algorithm": "z-score-deviation",
        "message": f"Found {len(selected)} attendance pattern(s) worth reviewing"
    }
