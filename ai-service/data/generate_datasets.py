"""
WorkNex AI — Dataset Generator
Generates 3 realistic datasets for ML model training:
  1. attendance_performance_dataset.csv  → Performance prediction (2500 records)
  2. leave_forecast_dataset.csv          → Leave demand forecasting (730 records)
  3. anomaly_detection_dataset.csv       → Attendance anomaly detection (1200 records)

Run: python ai-service/data/generate_datasets.py
Output files saved in the same directory as this script.
"""

import csv
import random
import math
from datetime import date, timedelta
from pathlib import Path

random.seed(2025)
OUT = Path(__file__).parent


# ─────────────────────────────────────────────────────────────
# Shared constants
# ─────────────────────────────────────────────────────────────
DEPARTMENTS = ["Engineering", "Marketing", "HR", "Finance", "Operations", "Sales", "QA"]

DEPT_BASE_SCORES = {
    "Engineering": 78, "Marketing": 72, "HR": 74, "Finance": 76,
    "Operations": 70, "Sales": 68, "QA": 75,
}

# Pakistan-specific month effects on leave demand
MONTH_LEAVE_FACTOR = {
    1: 0.85,  # Jan — low (post-holiday)
    2: 0.80,  # Feb — lowest
    3: 0.90,  # Mar
    4: 1.00,  # Apr
    5: 1.10,  # May
    6: 1.35,  # Jun — Eid ul Adha season + summer peak
    7: 1.45,  # Jul — summer peak
    8: 1.20,  # Aug — Independence Day + summer
    9: 0.95,  # Sep — back to normal
    10: 0.90, # Oct
    11: 0.85, # Nov
    12: 1.40, # Dec — year-end holidays
}

DAY_LEAVE_FACTOR = {0: 1.30, 1: 0.90, 2: 0.80, 3: 0.90, 4: 1.35, 5: 0.20, 6: 0.10}
# Mon=0, Fri=4 are highest; weekends near zero


def clamp(val, lo=0, hi=100):
    return round(max(lo, min(hi, val)), 2)


def randf(lo, hi, decimals=2):
    return round(random.uniform(lo, hi), decimals)


def randi(lo, hi):
    return random.randint(lo, hi)


# ─────────────────────────────────────────────────────────────
# DATASET 1 — Employee Attendance & Performance
# 2500 records: 50 employees × 50 months (rolling 4+ years)
# Target: performanceScore (0–100), attritionRisk (0/1)
# ─────────────────────────────────────────────────────────────
def gen_performance_dataset(n_employees=50, n_months=50):
    rows = []
    for emp_id in range(1, n_employees + 1):
        dept = random.choice(DEPARTMENTS)
        dept_base = DEPT_BASE_SCORES[dept]
        tenure_months = randi(3, 84)
        base_performance = randf(55, 97)

        for month_offset in range(n_months):
            month_num = (month_offset % 12) + 1
            year = 2023 + month_offset // 12

            # Simulate employee behaviour profiles
            profile = emp_id % 5
            if profile == 0:   # High performer
                attendance_rate = randf(92, 99)
                late_count = randi(0, 2)
                absence_count = randi(0, 1)
            elif profile == 1: # Average
                attendance_rate = randf(80, 95)
                late_count = randi(1, 5)
                absence_count = randi(0, 3)
            elif profile == 2: # Struggling
                attendance_rate = randf(65, 85)
                late_count = randi(3, 10)
                absence_count = randi(2, 6)
            elif profile == 3: # Leave-heavy
                attendance_rate = randf(75, 92)
                late_count = randi(0, 3)
                absence_count = randi(0, 2)
            else:              # Variable
                attendance_rate = randf(70, 98)
                late_count = randi(0, 8)
                absence_count = randi(0, 4)

            # Seasonal effects (Ramadan: Mar-Apr, summer: Jun-Aug)
            if month_num in (6, 7, 8):
                leave_count = randi(2, 8)
            elif month_num in (12, 1):
                leave_count = randi(1, 5)
            elif month_num in (3, 4):   # Ramadan/Eid approximation
                leave_count = randi(2, 6)
                late_count += randi(1, 3)  # late during Ramadan
            else:
                leave_count = randi(0, 4)

            avg_working_hours = randf(6.5, 9.5)
            overtime_hours = max(0, randf(-1, 15))
            half_day_count = randi(0, 3)

            # Dept average drifts slightly month to month
            dept_avg = clamp(dept_base + randf(-5, 5))

            # Previous score influences this month's score (inertia)
            prev_score = base_performance + randf(-8, 8)

            # Ground truth performance score
            score = (
                0.32 * attendance_rate
                + 0.24 * prev_score
                + 0.16 * dept_avg
                + 2.5 * avg_working_hours
                + 0.4 * min(overtime_hours, 10)
                - 1.4 * late_count
                - 2.1 * absence_count
                - 0.6 * leave_count
                - 1.2 * half_day_count
                + randf(-5, 5)   # real-world noise
            )
            perf_score = clamp(score)

            # Attrition risk: high if score low, absence high, long tenure in low dept
            attrition_score = (
                max(0, 70 - perf_score) * 0.35
                + absence_count * 4 * 0.25
                + late_count * 3 * 0.20
                + leave_count * 2 * 0.10
                + (20 if tenure_months < 6 else 5 if tenure_months > 60 else 0) * 0.10
            )
            attrition_risk = 1 if attrition_score >= 40 else 0

            rows.append({
                "employeeId": f"EMP-{emp_id:03d}",
                "department": dept,
                "tenureMonths": tenure_months + month_offset,
                "month": month_num,
                "year": year,
                "attendanceRate": attendance_rate,
                "lateCount": late_count,
                "absenceCount": absence_count,
                "leaveCount": leave_count,
                "averageWorkingHours": avg_working_hours,
                "overtimeHours": round(overtime_hours, 2),
                "halfDayCount": half_day_count,
                "previousPerformanceScore": round(prev_score, 2),
                "departmentAverage": dept_avg,
                "performanceScore": perf_score,
                "attritionRisk": attrition_risk,
            })

    random.shuffle(rows)
    return rows


# ─────────────────────────────────────────────────────────────
# DATASET 2 — Daily Leave Demand Forecast
# 730 records: 2 years of daily data (2024–2025)
# Target: totalLeavesApproved (count per day)
# ─────────────────────────────────────────────────────────────
def gen_leave_forecast_dataset():
    rows = []
    base_date = date(2024, 1, 1)
    team_size = 55
    rolling_leaves = [2.0] * 14  # rolling 14-day window

    for day_offset in range(730):
        d = base_date + timedelta(days=day_offset)
        dow = d.weekday()        # 0=Mon, 6=Sun
        month = d.month
        week_of_year = d.isocalendar()[1]
        is_weekend = 1 if dow >= 5 else 0

        # Pakistan public holidays approximation
        is_public_holiday = 1 if (
            (month == 3 and d.day == 23) or   # Pakistan Day
            (month == 8 and d.day == 14) or   # Independence Day
            (month == 12 and d.day == 25) or  # Quaid Day
            (month == 11 and d.day == 9)      # Iqbal Day
        ) else 0

        # Eid approximation (two Eids per year, each ±3 days)
        is_eid_season = 1 if (
            (month == 4 and 8 <= d.day <= 13) or     # Eid ul Fitr
            (month == 6 and 15 <= d.day <= 20)        # Eid ul Adha
        ) else 0

        # Ramadan effect (approx March 11 – April 9 in 2024)
        is_ramadan = 1 if (
            (d.year == 2024 and month == 3 and d.day >= 11) or
            (d.year == 2024 and month == 4 and d.day <= 9) or
            (d.year == 2025 and month == 3 and d.day >= 1 and d.day <= 30)
        ) else 0

        is_summer = 1 if month in (6, 7, 8) else 0
        is_year_end = 1 if (month == 12 and d.day >= 20) or (month == 1 and d.day <= 5) else 0
        is_monday = 1 if dow == 0 else 0
        is_friday = 1 if dow == 4 else 0

        # Previous week's leaves (rolling window)
        prev_week_leaves = round(sum(rolling_leaves[-7:]) / 7, 2)
        rolling_avg_14 = round(sum(rolling_leaves) / len(rolling_leaves), 2)

        # Generate actual leaves for the day
        if is_weekend:
            actual_leaves = 0
        else:
            base_rate = 2.5
            rate = (
                base_rate
                * MONTH_LEAVE_FACTOR.get(month, 1.0)
                * DAY_LEAVE_FACTOR.get(dow, 1.0)
                * (1.8 if is_eid_season else 1.0)
                * (1.3 if is_ramadan else 1.0)
                * (1.4 if is_summer else 1.0)
                * (1.5 if is_year_end else 1.0)
                * (1.2 if is_public_holiday else 1.0)
                * (1 + randf(-0.2, 0.3))
            )
            actual_leaves = max(0, round(rate + randf(-0.5, 0.5)))

        rolling_leaves.append(actual_leaves)
        rolling_leaves = rolling_leaves[-14:]

        rows.append({
            "date": d.isoformat(),
            "dayOfWeek": dow,
            "dayName": d.strftime("%A"),
            "month": month,
            "year": d.year,
            "weekOfYear": week_of_year,
            "isWeekend": is_weekend,
            "isPublicHoliday": is_public_holiday,
            "isEidSeason": is_eid_season,
            "isRamadan": is_ramadan,
            "isSummer": is_summer,
            "isYearEnd": is_year_end,
            "isMonday": is_monday,
            "isFriday": is_friday,
            "teamSize": team_size,
            "prevWeekDailyAvgLeaves": prev_week_leaves,
            "rollingAvg14Days": rolling_avg_14,
            "monthLeaveFactor": MONTH_LEAVE_FACTOR.get(month, 1.0),
            "totalLeavesApproved": actual_leaves,
        })

    return rows


# ─────────────────────────────────────────────────────────────
# DATASET 3 — Attendance Anomaly Detection
# 1200 records: employee-month observations
# Target: isAnomaly (0/1), anomalyType (string)
# ─────────────────────────────────────────────────────────────
def gen_anomaly_dataset(n_records=1200):
    rows = []
    for i in range(n_records):
        dept = random.choice(DEPARTMENTS)
        month = randi(1, 12)

        # 75% normal, 25% anomalous
        anomaly_type_roll = random.random()
        if anomaly_type_roll < 0.75:
            # Normal employee
            attendance_rate = randf(85, 99)
            late_count = randi(0, 2)
            absence_count = randi(0, 1)
            checkin_hour_avg = randf(8.5, 9.3)
            monday_absence_rate = randf(0, 0.15)
            friday_absence_rate = randf(0, 0.15)
            consecutive_late_max = randi(0, 2)
            early_checkout_count = randi(0, 1)
            checkin_std_dev = randf(0.1, 0.4)
            working_hours_avg = randf(7.5, 9.0)
            is_anomaly = 0
            anomaly_type = "NONE"

        elif anomaly_type_roll < 0.85:
            # Frequent late arrival
            attendance_rate = randf(78, 92)
            late_count = randi(6, 15)
            absence_count = randi(0, 2)
            checkin_hour_avg = randf(9.6, 11.0)
            monday_absence_rate = randf(0, 0.2)
            friday_absence_rate = randf(0, 0.2)
            consecutive_late_max = randi(4, 8)
            early_checkout_count = randi(0, 2)
            checkin_std_dev = randf(0.5, 1.5)
            working_hours_avg = randf(6.5, 8.0)
            is_anomaly = 1
            anomaly_type = "FREQUENT_LATE"

        elif anomaly_type_roll < 0.90:
            # Monday/Friday absence pattern
            attendance_rate = randf(72, 88)
            late_count = randi(0, 3)
            absence_count = randi(4, 8)
            checkin_hour_avg = randf(8.5, 9.5)
            monday_absence_rate = randf(0.4, 0.8)
            friday_absence_rate = randf(0.35, 0.75)
            consecutive_late_max = randi(0, 2)
            early_checkout_count = randi(1, 3)
            checkin_std_dev = randf(0.2, 0.8)
            working_hours_avg = randf(7.0, 8.5)
            is_anomaly = 1
            anomaly_type = "WEEKEND_BRIDGING"

        elif anomaly_type_roll < 0.95:
            # High absenteeism
            attendance_rate = randf(55, 75)
            late_count = randi(2, 6)
            absence_count = randi(7, 14)
            checkin_hour_avg = randf(8.5, 9.8)
            monday_absence_rate = randf(0.1, 0.4)
            friday_absence_rate = randf(0.1, 0.3)
            consecutive_late_max = randi(0, 3)
            early_checkout_count = randi(0, 4)
            checkin_std_dev = randf(0.3, 1.0)
            working_hours_avg = randf(5.5, 7.5)
            is_anomaly = 1
            anomaly_type = "HIGH_ABSENTEEISM"

        else:
            # Early checkout pattern
            attendance_rate = randf(82, 95)
            late_count = randi(0, 3)
            absence_count = randi(0, 2)
            checkin_hour_avg = randf(8.2, 9.0)
            monday_absence_rate = randf(0, 0.15)
            friday_absence_rate = randf(0.2, 0.5)
            consecutive_late_max = randi(0, 2)
            early_checkout_count = randi(8, 18)
            checkin_std_dev = randf(0.1, 0.4)
            working_hours_avg = randf(5.0, 6.8)
            is_anomaly = 1
            anomaly_type = "EARLY_CHECKOUT"

        rows.append({
            "recordId": f"REC-{i+1:04d}",
            "department": dept,
            "month": month,
            "attendanceRate30Days": attendance_rate,
            "lateCountThisMonth": late_count,
            "absenceCountThisMonth": absence_count,
            "checkInHourAvg": round(checkin_hour_avg, 2),
            "checkInStdDev": round(checkin_std_dev, 2),
            "mondayAbsenceRate": round(monday_absence_rate, 2),
            "fridayAbsenceRate": round(friday_absence_rate, 2),
            "consecutiveLateMax": consecutive_late_max,
            "earlyCheckoutCount": early_checkout_count,
            "avgWorkingHours": round(working_hours_avg, 2),
            "isAnomaly": is_anomaly,
            "anomalyType": anomaly_type,
        })

    random.shuffle(rows)
    return rows


# ─────────────────────────────────────────────────────────────
# Write CSV helpers
# ─────────────────────────────────────────────────────────────
def write_csv(path: Path, rows: list[dict], label: str):
    if not rows:
        print(f"  [WARN] No rows for {label}")
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  [OK] {label}: {len(rows)} rows -> {path.name}")


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nWorkNex AI — Generating Training Datasets\n" + "="*45)

    perf = gen_performance_dataset(n_employees=50, n_months=50)
    write_csv(OUT / "attendance_performance_dataset.csv", perf, "Performance Prediction")

    forecast = gen_leave_forecast_dataset()
    write_csv(OUT / "leave_forecast_dataset.csv", forecast, "Leave Demand Forecast")

    anomaly = gen_anomaly_dataset(n_records=1200)
    write_csv(OUT / "anomaly_detection_dataset.csv", anomaly, "Anomaly Detection")

    print(f"\nAll datasets saved to: {OUT}")
    print("\nNext step:")
    print("  python ai-service/training/train_all_models.py")
