# WorkNex AI — Workforce Intelligence Summary

## System Flow

WorkNex AI attendance, approved leaves, working hours and employee performance data ko combine karke workforce insights generate karta hai.

```text
Attendance + Leave + Employee Data
                ↓
           ETL Pipeline
                ↓
       Performance Records
                ↓
      AI/ML Risk Predictions
                ↓
 Forecast, Attrition and Analytics Dashboards
```

## ETL Pipeline

ETL selected month ke liye four steps chalati hai:

1. **Attendance ETL:** present, absent, late, half-day aur working-hour metrics calculate karti hai.
2. **Leave ETL:** approved leave requests aur utilized leave days calculate karti hai.
3. **Performance ETL:** attendance, leave aur punctuality ko combine karke monthly performance record banati hai.
4. **Attrition ETL:** performance record ko ML model se score karke monthly attrition-risk record save karti hai.

## AI Forecasts

- **Performance Prediction:** attendance, lateness, absence, leave, working hours, previous performance aur department average se projected score generate hota hai.
- **Leave Forecast:** recent organization leave history, weekdays, seasons and holidays use karke next 30 days ke expected employee-leave person-days predict hote hain.
- **Attrition Risk:** attendance, leave and performance patterns se LOW, MEDIUM, HIGH or CRITICAL advisory risk signal generate hota hai.
- **Attendance Anomalies:** frequent lateness and unusual absence patterns highlight kiye jate hain.

## Current Status

- AI service operational hai.
- Latest ETL execution successful thi.
- Performance aur attrition records PostgreSQL mein generate ho rahe hain.
- AI service unavailable hone par deterministic fallback available hai.
- Organization and role-based data scoping applied hai.
- Predictions advisory hain; final HR decision ke liye human review required hai.

## Important Limitations

- Current models generated/synthetic training data par trained hain, client-specific resignation history par nahi.
- Kuch attrition features—manager changes, warnings, exact tenure and department averages—abhi incomplete/default values use kar sakte hain.
- Attrition classifier abhi strong resignation predictor nahi hai.
- Production mein nightly ETL ke liye AWS EventBridge or another external scheduler configure karna hoga.
- Risk thresholds and dashboard labels ko ek common standard par align karna baqi hai.

## Client-Facing Explanation

> WorkNex AI converts attendance, leave and performance activity into monthly workforce indicators. Its predictive layer highlights employees and dates that may require HR attention. These predictions are advisory early-warning signals and do not replace human HR decisions.

## Recommended Positioning

Product ko **“AI-assisted workforce early-warning and decision-support platform”** present karein—not as a guaranteed employee resignation predictor.
