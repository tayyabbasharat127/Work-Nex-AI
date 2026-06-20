"""
WorkNex AI — Attrition Dataset Generator
Produces a labelled dataset for training a binary attrition classifier
and a continuous risk-score regressor.

Columns (features):
  tenure_months, attendance_rate, late_count, absence_count,
  leave_days_taken, annual_leave_remaining, performance_score,
  dept_avg_performance, overtime_hours, half_day_count,
  prev_month_score, manager_change_count, warnings_issued

Target columns:
  attrition_label   — 0 = stayed, 1 = left
  attrition_risk    — continuous 0-100 risk score
"""
from __future__ import annotations

import csv
import math
import random
from pathlib import Path

SEED = 42
random.seed(SEED)

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "attrition_dataset.csv"

DEPARTMENTS = ["Engineering", "Operations", "Finance", "HR", "Sales", "Support"]

FEATURES = [
    "employeeId", "department", "tenure_months",
    "attendance_rate", "late_count", "absence_count",
    "leave_days_taken", "annual_leave_remaining",
    "performance_score", "dept_avg_performance",
    "overtime_hours", "half_day_count",
    "prev_month_score", "manager_change_count", "warnings_issued",
    "attrition_risk", "attrition_label",
]


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _compute_risk(row: dict) -> float:
    """Deterministic risk formula — used to label the dataset."""
    tenure      = row["tenure_months"]
    attendance  = row["attendance_rate"]
    late        = row["late_count"]
    absent      = row["absence_count"]
    leave_taken = row["leave_days_taken"]
    perf        = row["performance_score"]
    prev_perf   = row["prev_month_score"]
    mgr_chg     = row["manager_change_count"]
    warnings    = row["warnings_issued"]

    # Weighted risk components
    tenure_risk      = 30 if tenure < 6 else (15 if tenure < 12 else (5 if tenure > 48 else 10))
    attendance_risk  = _clamp((100 - attendance) * 0.55)
    late_risk        = _clamp(late * 5)
    absence_risk     = _clamp(absent * 8)
    leave_risk       = _clamp(max(0, leave_taken - 8) * 4)
    perf_risk        = _clamp((100 - perf) * 0.4)
    perf_drop_risk   = _clamp(max(0, prev_perf - perf) * 1.2)
    mgr_risk         = mgr_chg * 12
    warning_risk     = warnings * 20

    raw = (
        tenure_risk * 0.10
        + attendance_risk * 0.20
        + late_risk * 0.08
        + absence_risk * 0.12
        + leave_risk * 0.08
        + perf_risk * 0.18
        + perf_drop_risk * 0.10
        + mgr_risk * 0.08
        + warning_risk * 0.06
    )
    noise = random.gauss(0, 3)
    return round(_clamp(raw + noise), 2)


def generate_row(i: int) -> dict:
    dept = random.choice(DEPARTMENTS)
    tenure = random.randint(1, 96)

    # Correlated features — bad attendance → higher late/absent
    attendance = _clamp(random.gauss(88, 12))
    late_count = max(0, int(random.gauss(max(0, (100 - attendance) * 0.25), 1.5)))
    absence_count = max(0, int(random.gauss(max(0, (100 - attendance) * 0.15), 1.2)))

    leave_policy = 20
    leave_taken = max(0, min(leave_policy, int(random.gauss(8, 4))))
    annual_remaining = leave_policy - leave_taken

    perf = _clamp(random.gauss(74, 14))
    prev_perf = _clamp(perf + random.gauss(0, 6))
    dept_avg = _clamp(random.gauss(75, 8))
    overtime = max(0, round(random.gauss(4, 6), 1))
    half_days = max(0, int(random.gauss(1, 1.5)))
    mgr_changes = random.choices([0, 1, 2, 3], weights=[65, 22, 10, 3])[0]
    warnings = random.choices([0, 1, 2, 3], weights=[72, 18, 7, 3])[0]

    row = {
        "employeeId":           f"EMP{i:04d}",
        "department":           dept,
        "tenure_months":        tenure,
        "attendance_rate":      round(attendance, 2),
        "late_count":           late_count,
        "absence_count":        absence_count,
        "leave_days_taken":     leave_taken,
        "annual_leave_remaining": annual_remaining,
        "performance_score":    round(perf, 2),
        "dept_avg_performance": round(dept_avg, 2),
        "overtime_hours":       overtime,
        "half_day_count":       half_days,
        "prev_month_score":     round(prev_perf, 2),
        "manager_change_count": mgr_changes,
        "warnings_issued":      warnings,
    }

    risk = _compute_risk(row)
    # Label: probabilistic based on risk score
    prob_leave = _clamp(risk / 100) * 0.7 + random.uniform(-0.05, 0.05)
    label = 1 if random.random() < prob_leave else 0

    row["attrition_risk"]  = risk
    row["attrition_label"] = label
    return row


def main(rows: int = 3000) -> None:
    data = [generate_row(i) for i in range(rows)]
    with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FEATURES)
        writer.writeheader()
        writer.writerows(data)

    labels = [r["attrition_label"] for r in data]
    print(f"[OK] Generated {rows} rows -> {OUTPUT}")
    print(f"     Attrition rate: {sum(labels)/len(labels)*100:.1f}%")
    print(f"     Features: {len(FEATURES) - 3} predictors + risk + label")


if __name__ == "__main__":
    main()
