"""
WorkNex AI - Attendance & Leave Dataset Generator

Generates 5 realistic datasets for ML model training and forecasting:

  1. attendance_records.csv        - Daily records (50 employees, 2 years)
  2. leave_requests.csv            - Leave history with approval outcomes
  3. monthly_employee_summary.csv  - Monthly aggregated metrics (full feature set)
  4. performance_model_training.csv- Ready-to-use training file for RandomForest
  5. leave_forecast_monthly.csv    - Monthly leave demand by dept (for time-series)

Usage:
  python training/generate_dataset.py

Then retrain the performance model using real data:
  PERFORMANCE_TRAINING_CSV=training/data/performance_model_training.csv \\
      python training/train_performance_model.py
"""
from __future__ import annotations

import csv
import random
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

random.seed(2024)

# ── Config ────────────────────────────────────────────────────────────────────
START_DATE = date(2024, 1, 1)
END_DATE = date(2025, 12, 31)

DEPARTMENTS: dict[str, dict] = {
    "Engineering":  {"size": 12, "overtime_factor": 1.4, "leave_factor": 0.9},
    "Operations":   {"size": 10, "overtime_factor": 1.1, "leave_factor": 1.0},
    "Finance":      {"size":  8, "overtime_factor": 0.8, "leave_factor": 1.1},
    "HR":           {"size":  8, "overtime_factor": 0.7, "leave_factor": 1.0},
    "Sales":        {"size": 12, "overtime_factor": 0.9, "leave_factor": 1.2},
}

LEAVE_TYPES = ["ANNUAL", "SICK", "CASUAL", "UNPAID", "MATERNITY", "PATERNITY"]

MONTH_LEAVE_WEIGHTS = {
    1: 0.8, 2: 0.7, 3: 0.9, 4: 1.0, 5: 1.1,
    6: 1.3, 7: 1.5, 8: 1.4, 9: 0.9, 10: 0.8, 11: 0.9, 12: 1.5,
}

# Pakistan public holidays (approximate, Mon–Fri working calendar)
_HOLIDAYS: set[date] = {
    # 2024
    date(2024, 2, 5),  date(2024, 3, 23), date(2024, 4, 10),
    date(2024, 4, 11), date(2024, 4, 12), date(2024, 5, 1),
    date(2024, 6, 17), date(2024, 6, 18), date(2024, 7, 16),
    date(2024, 8, 14), date(2024, 9, 16), date(2024, 11, 9),
    date(2024, 12, 25), date(2024, 12, 27),
    # 2025
    date(2025, 2, 5),  date(2025, 3, 23), date(2025, 3, 31),
    date(2025, 4, 1),  date(2025, 4, 2),  date(2025, 5, 1),
    date(2025, 6, 7),  date(2025, 6, 8),  date(2025, 6, 9),
    date(2025, 8, 14), date(2025, 9, 5),  date(2025, 11, 9),
    date(2025, 12, 25),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _date_range(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def _season(month: int) -> str:
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Spring"
    if month in (6, 7, 8):
        return "Summer"
    return "Autumn"


def _quarter(month: int) -> int:
    return (month - 1) // 3 + 1


# ── Employees ─────────────────────────────────────────────────────────────────

def build_employees() -> list[dict]:
    employees: list[dict] = []
    emp_id = 1001
    for dept, cfg in DEPARTMENTS.items():
        for _ in range(cfg["size"]):
            profile = random.choices(
                ["star", "average", "underperformer", "inconsistent"],
                weights=[0.15, 0.55, 0.15, 0.15],
            )[0]
            gender = random.choice(["M", "F"])
            employees.append({
                "employeeId": f"EMP{emp_id:04d}",
                "department": dept,
                "gender": gender,
                "tenureMonths": random.randint(3, 72),
                "profile": profile,
                "overtime_factor": cfg["overtime_factor"],
                "leave_factor": cfg["leave_factor"],
            })
            emp_id += 1
    return employees


# ── Attendance Records ────────────────────────────────────────────────────────

_PROFILE_RATES = {
    "star":          {"absent": 0.005, "late": 0.040, "half_day": 0.015},
    "average":       {"absent": 0.030, "late": 0.070, "half_day": 0.030},
    "underperformer":{"absent": 0.070, "late": 0.120, "half_day": 0.050},
    "inconsistent":  {"absent": 0.040, "late": 0.090, "half_day": 0.050},
}

_DOW_ABSENT  = {0: 1.1, 1: 0.9, 2: 0.85, 3: 0.9, 4: 1.15}
_MON_ABSENT  = {1: 0.9, 2: 0.85, 3: 0.9, 4: 0.95, 5: 1.05,
                6: 1.20, 7: 1.25, 8: 1.15, 9: 0.95, 10: 0.9, 11: 0.95, 12: 1.30}
_DOW_LEAVE   = {0: 1.1, 1: 0.9, 2: 0.80, 3: 0.9, 4: 1.20}


def _fmt_time(minutes: int) -> str:
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def build_attendance(employees: list[dict]) -> list[dict]:
    records: list[dict] = []
    for emp in employees:
        rates = _PROFILE_RATES[emp["profile"]]
        ovt   = emp["overtime_factor"]

        for d in _date_range(START_DATE, END_DATE):
            if d.weekday() >= 5:
                continue

            row_base = {
                "employeeId": emp["employeeId"],
                "department": emp["department"],
                "date":       d.isoformat(),
                "dayOfWeek":  d.strftime("%A"),
                "month":      d.month,
                "year":       d.year,
                "weekOfYear": d.isocalendar()[1],
                "quarter":    _quarter(d.month),
            }

            if d in _HOLIDAYS:
                records.append({**row_base, "status": "HOLIDAY",
                    "checkIn": None, "checkOut": None,
                    "workingHours": 0, "overtimeHours": 0,
                    "isLate": 0, "isHalfDay": 0, "isAbsent": 0, "isOnLeave": 0})
                continue

            dow = d.weekday()
            month_factor = _MON_ABSENT[d.month]
            dow_factor   = _DOW_ABSENT[dow]
            leave_bump   = 0.04 * MONTH_LEAVE_WEIGHTS[d.month] * _DOW_LEAVE.get(dow, 1.0)

            p_absent   = rates["absent"]   * dow_factor * month_factor
            p_leave    = leave_bump
            p_half_day = rates["half_day"]
            p_late     = rates["late"]     * dow_factor

            rand = random.random()
            cumulative = 0.0

            if rand < (cumulative := p_absent):
                status = "ABSENT"
                ci = co = None; wh = oh = 0
            elif rand < (cumulative := cumulative + p_leave):
                status = "ON_LEAVE"
                ci = co = None; wh = oh = 0
            elif rand < (cumulative := cumulative + p_half_day):
                status = "HALF_DAY"
                ci_min = 9 * 60 + random.randint(-15, 45)
                co_min = ci_min + int(4 * 60 + random.uniform(-20, 20))
                ci, co = _fmt_time(ci_min), _fmt_time(co_min)
                wh = round((co_min - ci_min) / 60, 1)
                oh = 0
            elif rand < (cumulative := cumulative + p_late):
                status = "LATE"
                ci_min = 9 * 60 + 31 + random.randint(0, 59)
                work_min = int(8 * 60 * ovt * random.uniform(0.9, 1.1))
                co_min   = ci_min + work_min
                ci, co = _fmt_time(ci_min), _fmt_time(co_min)
                wh = round(work_min / 60, 1)
                oh = round(max(0, wh - 8), 1)
            else:
                status = "PRESENT"
                ci_min = 9 * 60 + random.randint(-20, 20)
                work_h = 8 * ovt * random.uniform(0.92, 1.15)
                co_min = ci_min + int(work_h * 60)
                ci, co = _fmt_time(ci_min), _fmt_time(co_min)
                wh = round(work_h, 1)
                oh = round(max(0, wh - 8), 1)

            records.append({**row_base,
                "status": status, "checkIn": ci, "checkOut": co,
                "workingHours": wh, "overtimeHours": oh,
                "isLate":    1 if status == "LATE"     else 0,
                "isHalfDay": 1 if status == "HALF_DAY" else 0,
                "isAbsent":  1 if status == "ABSENT"   else 0,
                "isOnLeave": 1 if status == "ON_LEAVE" else 0,
            })

    return records


# ── Leave Requests ────────────────────────────────────────────────────────────

_LT_WEIGHTS   = [0.35, 0.25, 0.20, 0.08, 0.06, 0.06]
_MONTH_CHOICES = list(range(1, 13))


def build_leave_requests(employees: list[dict]) -> list[dict]:
    requests: list[dict] = []
    req_id = 1
    month_weights = list(MONTH_LEAVE_WEIGHTS.values())

    for emp in employees:
        profile = emp["profile"]
        n_per_year = {
            "star":          random.randint(3, 6),
            "average":       random.randint(4, 8),
            "underperformer":random.randint(6, 12),
            "inconsistent":  random.randint(5, 10),
        }[profile]

        for year in (2024, 2025):
            for _ in range(n_per_year):
                month = random.choices(_MONTH_CHOICES, weights=month_weights)[0]
                max_day = [31, 28 + (1 if year % 4 == 0 else 0), 31, 30, 31, 30,
                           31, 31, 30, 31, 30, 31][month - 1]
                start_day = random.randint(1, max_day - 1)
                leave_start = date(year, month, start_day)
                if leave_start > END_DATE:
                    continue

                lt = random.choices(LEAVE_TYPES, weights=_LT_WEIGHTS)[0]
                if lt == "MATERNITY" and emp["gender"] != "F":
                    lt = "CASUAL"
                if lt == "PATERNITY" and emp["gender"] != "M":
                    lt = "ANNUAL"

                dur = {
                    "ANNUAL": random.randint(1, 5),
                    "SICK":   random.randint(1, 3),
                    "CASUAL": random.randint(1, 2),
                    "UNPAID": random.randint(1, 4),
                    "MATERNITY": random.randint(30, 90),
                    "PATERNITY": random.randint(3, 5),
                }[lt]
                leave_end = min(leave_start + timedelta(days=dur - 1), END_DATE)

                if profile == "star":
                    sw = [0.85, 0.08, 0.05, 0.02]
                elif profile == "underperformer":
                    sw = [0.55, 0.25, 0.15, 0.05]
                else:
                    sw = [0.75, 0.15, 0.08, 0.02]
                status = random.choices(
                    ["APPROVED", "REJECTED", "PENDING", "CANCELLED"], weights=sw
                )[0]

                advance = random.randint(-2, 30)
                applied = leave_start - timedelta(days=max(0, advance))

                requests.append({
                    "requestId":        f"LR{req_id:05d}",
                    "employeeId":       emp["employeeId"],
                    "department":       emp["department"],
                    "leaveType":        lt,
                    "startDate":        leave_start.isoformat(),
                    "endDate":          leave_end.isoformat(),
                    "totalDays":        (leave_end - leave_start).days + 1,
                    "month":            leave_start.month,
                    "year":             leave_start.year,
                    "quarter":          _quarter(leave_start.month),
                    "dayOfWeek":        leave_start.strftime("%A"),
                    "status":           status,
                    "daysAdvanceNotice": max(0, advance),
                    "isEmergencyLeave": 1 if advance <= 0 else 0,
                    "season":           _season(leave_start.month),
                    "appliedDate":      applied.isoformat(),
                })
                req_id += 1

    return requests


# ── Monthly Employee Summary ──────────────────────────────────────────────────

def build_monthly_summary(employees: list[dict], attendance: list[dict]) -> list[dict]:
    agg: dict[tuple, dict] = defaultdict(lambda: {
        "present": 0, "absent": 0, "late": 0, "half": 0,
        "leave": 0, "hours": 0.0, "overtime": 0.0, "wd": 0,
    })

    for rec in attendance:
        key = (rec["employeeId"], rec["year"], rec["month"])
        s = agg[key]
        status = rec["status"]
        if status == "HOLIDAY":
            continue
        s["wd"] += 1
        if status in ("PRESENT", "LATE"):
            s["present"] += 1
        if status == "LATE":
            s["late"] += 1
        if status == "HALF_DAY":
            s["half"] += 1
            s["present"] += 1
        if status == "ABSENT":
            s["absent"] += 1
        if status == "ON_LEAVE":
            s["leave"] += 1
        s["hours"]    += float(rec["workingHours"] or 0)
        s["overtime"] += float(rec["overtimeHours"] or 0)

    emp_map  = {e["employeeId"]: e for e in employees}
    dept_scores: dict[tuple, list[float]] = defaultdict(list)
    prev_scores: dict[str, float] = {}
    rows: list[dict] = []
    placeholder: list[dict] = []

    for (emp_id, year, month), s in sorted(agg.items()):
        emp = emp_map[emp_id]
        wd   = max(1, s["wd"])
        att_rate = round(min(100, s["present"] / wd * 100), 1)
        avg_h    = round(s["hours"] / max(1, s["present"]), 1) if s["present"] else 0.0
        ovt_h    = round(s["overtime"], 1)
        prev     = prev_scores.get(emp_id, round(random.uniform(60, 90), 2))

        score = (
            0.33 * att_rate
            + 0.26 * prev
            + 2.30 * min(9.8, avg_h)
            + 0.35 * min(ovt_h, 10)
            - 1.50 * s["late"]
            - 2.20 * s["absent"]
            - 0.70 * s["leave"]
            - 1.40 * s["half"]
            + random.uniform(-3, 3)
        )
        score = round(max(30, min(100, score)), 2)

        dk = (emp["department"], year, month)
        dept_scores[dk].append(score)

        tenure = emp["tenureMonths"] + max(0, (year - 2024) * 12 + month - 1)

        attrition = int(
            att_rate < 75
            or s["late"] > 6
            or (prev < 65 and score < 65)
            or s["absent"] > 4
            or (tenure < 6)
        )

        row = {
            "employeeId":              emp_id,
            "department":              emp["department"],
            "month":                   month,
            "year":                    year,
            "tenureMonths":            tenure,
            "attendanceRate":          att_rate,
            "presentDays":             s["present"],
            "absentDays":              s["absent"],
            "lateDays":                s["late"],
            "halfDays":                s["half"],
            "leaveDays":               s["leave"],
            "workingDays":             wd,
            "averageWorkingHours":     avg_h,
            "overtimeHours":           ovt_h,
            "previousPerformanceScore": round(prev, 2),
            "performanceScore":        score,
            "riskLevel":               "HIGH" if score < 60 else "MEDIUM" if score < 75 else "LOW",
            "attritionRisk":           attrition,
            "_dk":                     dk,
        }
        placeholder.append(row)
        prev_scores[emp_id] = score

    for row in placeholder:
        dk = row.pop("_dk")
        vals = dept_scores[dk]
        row["departmentAverage"] = round(sum(vals) / len(vals), 2) if vals else 70.0

    return placeholder


# ── Leave Forecast Monthly ────────────────────────────────────────────────────

def build_leave_forecast(leave_requests: list[dict]) -> list[dict]:
    monthly: dict[tuple, dict[str, dict]] = defaultdict(
        lambda: defaultdict(lambda: {
            "totalRequests": 0, "totalDays": 0, "approved": 0, "rejected": 0,
            "annual": 0, "sick": 0, "casual": 0, "unpaid": 0,
        })
    )
    for req in leave_requests:
        key  = (req["year"], req["month"])
        dept = req["department"]
        d    = monthly[key][dept]
        d["totalRequests"] += 1
        d["totalDays"]     += req["totalDays"]
        if req["status"] == "APPROVED":
            d["approved"] += 1
        elif req["status"] == "REJECTED":
            d["rejected"] += 1
        lt = req["leaveType"].lower()
        if lt in d:
            d[lt] += 1

    rows: list[dict] = []
    for (year, month), dept_data in sorted(monthly.items()):
        for dept, d in dept_data.items():
            rows.append({
                "year":               year,
                "month":              month,
                "monthName":          datetime(year, month, 1).strftime("%B"),
                "quarter":            _quarter(month),
                "season":             _season(month),
                "department":         dept,
                "totalLeaveRequests": d["totalRequests"],
                "totalLeaveDays":     d["totalDays"],
                "approvedRequests":   d["approved"],
                "rejectedRequests":   d["rejected"],
                "annualLeaves":       d["annual"],
                "sickLeaves":         d["sick"],
                "casualLeaves":       d["casual"],
                "unpaidLeaves":       d["unpaid"],
                "approvalRate":       round(d["approved"] / max(1, d["totalRequests"]) * 100, 1),
                "monthLeaveWeight":   MONTH_LEAVE_WEIGHTS.get(month, 1.0),
            })
    return rows


# ── CSV Writer ────────────────────────────────────────────────────────────────

def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"  {path.name:<45} {len(rows):>7,} rows")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    OUT = Path(__file__).parent / "data"

    print("Building employees …")
    employees = build_employees()
    print(f"  {len(employees)} employees | {len(DEPARTMENTS)} departments\n")

    print("Building daily attendance records (2024-01-01 → 2025-12-31) …")
    attendance = build_attendance(employees)

    print("Building leave requests …")
    leaves = build_leave_requests(employees)

    print("Building monthly employee summaries …")
    monthly = build_monthly_summary(employees, attendance)

    print("Aggregating leave forecast data …")
    forecast = build_leave_forecast(leaves)

    # Performance model training slice (matches train_performance_model.py FEATURES)
    perf_training = [
        {
            "attendanceRate":          r["attendanceRate"],
            "lateCount":               r["lateDays"],
            "absenceCount":            r["absentDays"],
            "leaveCount":              r["leaveDays"],
            "averageWorkingHours":     r["averageWorkingHours"],
            "previousPerformanceScore":r["previousPerformanceScore"],
            "departmentAverage":       r["departmentAverage"],
            "overtimeHours":           r["overtimeHours"],
            "halfDayCount":            r["halfDays"],
            "performanceScore":        r["performanceScore"],
        }
        for r in monthly
    ]

    print("\nWriting datasets to", OUT, "…")
    write_csv(OUT / "attendance_records.csv", attendance, [
        "employeeId", "department", "date", "dayOfWeek", "month", "year",
        "weekOfYear", "quarter", "status", "checkIn", "checkOut",
        "workingHours", "overtimeHours", "isLate", "isHalfDay", "isAbsent", "isOnLeave",
    ])
    write_csv(OUT / "leave_requests.csv", leaves, [
        "requestId", "employeeId", "department", "leaveType",
        "startDate", "endDate", "totalDays", "month", "year", "quarter",
        "dayOfWeek", "status", "daysAdvanceNotice", "isEmergencyLeave", "season", "appliedDate",
    ])
    write_csv(OUT / "monthly_employee_summary.csv", monthly, [
        "employeeId", "department", "month", "year", "tenureMonths",
        "attendanceRate", "presentDays", "absentDays", "lateDays", "halfDays",
        "leaveDays", "workingDays", "averageWorkingHours", "overtimeHours",
        "previousPerformanceScore", "departmentAverage",
        "performanceScore", "riskLevel", "attritionRisk",
    ])
    write_csv(OUT / "performance_model_training.csv", perf_training, [
        "attendanceRate", "lateCount", "absenceCount", "leaveCount",
        "averageWorkingHours", "previousPerformanceScore", "departmentAverage",
        "overtimeHours", "halfDayCount", "performanceScore",
    ])
    write_csv(OUT / "leave_forecast_monthly.csv", forecast, [
        "year", "month", "monthName", "quarter", "season", "department",
        "totalLeaveRequests", "totalLeaveDays", "approvedRequests", "rejectedRequests",
        "annualLeaves", "sickLeaves", "casualLeaves", "unpaidLeaves",
        "approvalRate", "monthLeaveWeight",
    ])

    print("\nDone.")
    print("\nRetrain the performance model with real data:")
    print(
        "  PERFORMANCE_TRAINING_CSV=training/data/performance_model_training.csv "
        "python training/train_performance_model.py"
    )


if __name__ == "__main__":
    main()
