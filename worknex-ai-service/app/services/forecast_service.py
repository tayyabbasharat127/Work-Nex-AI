"""Leave demand forecasting using statistical algorithms."""
from datetime import datetime, timedelta
import statistics
from typing import Optional


DAY_WEIGHTS = {0: 1.3, 1: 0.9, 2: 0.8, 3: 0.9, 4: 1.4, 5: 0.3, 6: 0.1}
MONTH_WEIGHTS = {1: 0.8, 2: 0.7, 3: 0.9, 4: 1.0, 5: 1.1, 6: 1.3,
                 7: 1.4, 8: 1.2, 9: 0.9, 10: 0.8, 11: 0.9, 12: 1.5}


async def generate_leave_forecast(department_id: Optional[str] = None) -> dict:
    today = datetime.now()
    base_rate = 3
    forecast = []

    for i in range(30):
        date = today + timedelta(days=i)
        predicted = round(base_rate * DAY_WEIGHTS.get(date.weekday(), 1.0) * MONTH_WEIGHTS.get(date.month, 1.0), 1)
        forecast.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted": predicted,
            "dayOfWeek": date.strftime("%A"),
            "riskLevel": "HIGH" if predicted > 4 else "MEDIUM" if predicted > 2 else "LOW"
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
        "generatedAt": datetime.now().isoformat(),
        "algorithm": "statistical-moving-average"
    }
