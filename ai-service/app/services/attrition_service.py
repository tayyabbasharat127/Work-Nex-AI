"""
WorkNex AI — Attrition Risk Service (ML-backed, production)
============================================================
Loads TWO trained models:
  attrition_classifier.pkl  → P(leave) probability per employee
  attrition_regressor.pkl   → continuous risk score 0-100

Inference pipeline:
  1. Fetch real PerformanceRecord + Attendance data from backend
  2. Build feature vectors per employee
  3. Run classifier → leave probability
  4. Run regressor  → risk score
  5. Enrich with risk factors, recommendations
  6. Return sorted by risk descending

Fallback chain:
  ML models → department-aggregate scoring → synthetic demo data
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

from app.core.config import settings
from app.core.auth import get_current_token

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CLASSIFIER_PATH = ROOT / "models" / "attrition_classifier.pkl"
REGRESSOR_PATH  = ROOT / "models" / "attrition_regressor.pkl"
CLASSIFIER_META = ROOT / "models" / "attrition_classifier_metadata.json"
REGRESSOR_META  = ROOT / "models" / "attrition_regressor_metadata.json"

FEATURE_COLS = [
    "tenure_months",
    "attendance_rate",
    "late_count",
    "absence_count",
    "leave_days_taken",
    "annual_leave_remaining",
    "performance_score",
    "dept_avg_performance",
    "overtime_hours",
    "half_day_count",
    "prev_month_score",
    "manager_change_count",
    "warnings_issued",
]

FACTOR_LABELS = {
    "high_absenteeism":  "Attendance rate below 78% threshold",
    "low_performance":   "Overall performance score below 70",
    "excessive_leave":   "Leave days taken exceed 8 in current period",
    "late_pattern":      "More than 4 late arrivals this month",
    "tenure_risk":       "Short tenure (< 6 months) or long tenure (> 4 years) without progression",
    "manager_change":    "Multiple manager changes — instability signal",
    "disciplinary":      "One or more warnings/disciplinary actions on record",
    "perf_declining":    "Performance score dropped vs previous month",
}

RECOMMENDATIONS = {
    "high_absenteeism":  "Initiate a wellness check-in and review workload balance.",
    "low_performance":   "Schedule a structured PIP with clear KPI targets and support.",
    "excessive_leave":   "Investigate leave patterns — may indicate burnout or personal issues.",
    "late_pattern":      "Discuss flexible-hours policy or commute support options.",
    "tenure_risk":       "Clarify career growth path and compensation review schedule.",
    "manager_change":    "Assign a mentor or buddy to restore team stability.",
    "disciplinary":      "HR review required — understand root cause before escalation.",
    "perf_declining":    "Monthly 1-on-1 to identify blockers and offer coaching.",
}


# ─── Model loader ─────────────────────────────────────────────────────────────

class _ModelCache:
    _clf = None
    _reg = None
    _clf_threshold: float = 0.45

    @classmethod
    def classifier(cls):
        if cls._clf is None:
            cls._clf, cls._clf_threshold = _load_artifact(CLASSIFIER_PATH, CLASSIFIER_META)
        return cls._clf, cls._clf_threshold

    @classmethod
    def regressor(cls):
        if cls._reg is None:
            cls._reg, _ = _load_artifact(REGRESSOR_PATH, REGRESSOR_META)
        return cls._reg


def _load_artifact(path: Path, meta_path: Path):
    if not path.exists():
        return None, 0.45
    try:
        import joblib
        artifact = joblib.load(path)
        model = artifact.get("model") if isinstance(artifact, dict) else artifact
        threshold = artifact.get("threshold", 0.45) if isinstance(artifact, dict) else 0.45
        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            threshold = meta.get("threshold", threshold)
        logger.info("Loaded model: %s", path.name)
        return model, threshold
    except Exception as exc:
        logger.warning("Could not load %s: %s", path.name, exc)
        return None, 0.45


# ─── Backend data fetcher ─────────────────────────────────────────────────────

async def _fetch(path: str) -> Any:
    token = get_current_token()
    if not token:
        return None
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(
                f"{settings.BACKEND_URL}{path}",
                headers={"Authorization": f"Bearer {token}"},
            )
        if r.status_code == 200:
            return r.json().get("data")
    except Exception as exc:
        logger.warning("Backend fetch failed %s: %s", path, exc)
    return None


# ─── Feature builder ──────────────────────────────────────────────────────────

def _build_feature_vector(emp: dict) -> list[float]:
    """Map a backend employee dict to the model's FEATURE_COLS vector."""
    perf    = float(emp.get("performance_score", 75) or 75)
    prev    = float(emp.get("prev_month_score", perf) or perf)
    return [
        float(emp.get("tenure_months", 12)         or 12),
        float(emp.get("attendance_rate", 85)        or 85),
        float(emp.get("late_count", 0)              or 0),
        float(emp.get("absence_count", 0)           or 0),
        float(emp.get("leave_days_taken", 0)        or 0),
        float(emp.get("annual_leave_remaining", 10) or 10),
        perf,
        float(emp.get("dept_avg_performance", 75)   or 75),
        float(emp.get("overtime_hours", 0)           or 0),
        float(emp.get("half_day_count", 0)           or 0),
        prev,
        float(emp.get("manager_change_count", 0)    or 0),
        float(emp.get("warnings_issued", 0)          or 0),
    ]


def _detect_factors(emp: dict, risk_score: float) -> list[str]:
    factors = []
    if float(emp.get("attendance_rate", 100)) < 78:
        factors.append("high_absenteeism")
    if float(emp.get("performance_score", 100)) < 70:
        factors.append("low_performance")
    if float(emp.get("leave_days_taken", 0)) > 8:
        factors.append("excessive_leave")
    if float(emp.get("late_count", 0)) > 4:
        factors.append("late_pattern")
    tenure = float(emp.get("tenure_months", 24))
    if tenure < 6 or tenure > 48:
        factors.append("tenure_risk")
    if float(emp.get("manager_change_count", 0)) > 1:
        factors.append("manager_change")
    if float(emp.get("warnings_issued", 0)) > 0:
        factors.append("disciplinary")
    perf = float(emp.get("performance_score", 75))
    prev = float(emp.get("prev_month_score", perf))
    if prev - perf > 8:
        factors.append("perf_declining")
    return factors


def _risk_level(score: float) -> str:
    if score >= 65:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


# ─── ML inference ─────────────────────────────────────────────────────────────

def _run_ml_inference(employees: list[dict]) -> list[dict]:
    clf, threshold = _ModelCache.classifier()
    reg = _ModelCache.regressor()

    fvs = [_build_feature_vector(e) for e in employees]
    results = []

    for emp, fv in zip(employees, fvs):
        # Risk score
        risk_score = 50.0
        ml_used    = False
        if reg is not None:
            try:
                raw = float(reg.predict([fv])[0])
                risk_score = round(max(0.0, min(100.0, raw)), 1)
                ml_used = True
            except Exception as exc:
                logger.warning("Regressor predict failed: %s", exc)

        # Leave probability
        leave_prob = None
        if clf is not None:
            try:
                leave_prob = round(float(clf.predict_proba([fv])[0][1]), 3)
            except Exception as exc:
                logger.warning("Classifier predict failed: %s", exc)

        # Fallback deterministic if models failed
        if not ml_used:
            risk_score = _deterministic_risk(emp)

        factors = _detect_factors(emp, risk_score)
        name = f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() or emp.get("name", "?")
        dept = (emp.get("department") or {}).get("name", emp.get("dept_name", "Unassigned")) if isinstance(emp.get("department"), dict) else emp.get("dept_name", "Unassigned")

        results.append({
            "employeeId":      emp.get("employeeId", emp.get("id", "?")),
            "name":            name,
            "department":      dept,
            "riskScore":       risk_score,
            "riskLevel":       _risk_level(risk_score),
            "leaveProbability": leave_prob,
            "performanceScore": round(float(emp.get("performance_score", 0)), 1),
            "attendanceRate":  round(float(emp.get("attendance_rate", 0)), 1),
            "factors":         factors,
            "factorLabels":    [FACTOR_LABELS[f] for f in factors if f in FACTOR_LABELS],
            "recommendations": list({RECOMMENDATIONS[f] for f in factors if f in RECOMMENDATIONS}),
            "mlUsed":          ml_used,
        })

    return results


def _deterministic_risk(emp: dict) -> float:
    """Rule-based fallback when ML models unavailable."""
    att  = float(emp.get("attendance_rate", 85))
    perf = float(emp.get("performance_score", 75))
    leave= float(emp.get("leave_days_taken", 0))
    late = float(emp.get("late_count", 0))
    t    = float(emp.get("tenure_months", 24))
    return round(min(100.0, max(0.0,
        max(0, 100 - att) * 0.30
        + max(0, 100 - perf) * 0.25
        + min(100, leave * 6) * 0.20
        + min(100, late * 8) * 0.10
        + (20 if t < 6 or t > 48 else 5) * 0.15
    )), 1)


# ─── Data transformers ────────────────────────────────────────────────────────

def _from_performance_records(records: list[dict]) -> list[dict]:
    """Transform backend PerformanceRecord + user data into feature dicts."""
    out = []
    for r in records:
        user = r.get("user") or {}
        dept = user.get("department") or {}
        out.append({
            "id":                  r.get("userId", "?"),
            "employeeId":          user.get("employeeId", "?"),
            "firstName":           user.get("firstName", ""),
            "lastName":            user.get("lastName", ""),
            "dept_name":           dept.get("name", "Unassigned"),
            "performance_score":   r.get("overallScore", 75),
            "attendance_rate":     r.get("attendanceScore", 85),
            "late_count":          r.get("lateDays", 0),
            "absence_count":       r.get("absentDays", 0),
            "leave_days_taken":    r.get("leaveDays", 0),
            "annual_leave_remaining": 20 - int(r.get("leaveDays", 0) or 0),
            "overtime_hours":      r.get("avgWorkingHours", 8) - 8 if float(r.get("avgWorkingHours") or 8) > 8 else 0,
            "half_day_count":      0,
            "prev_month_score":    r.get("prevScore", r.get("overallScore", 75)),
            "dept_avg_performance": 75,
            "tenure_months":       24,
            "manager_change_count": 0,
            "warnings_issued":     0,
        })
    return out


def _from_dept_aggregate(dept_records: list[dict]) -> list[dict]:
    """Fallback: build dept-level pseudo-employees when per-user data unavailable."""
    out = []
    for d in dept_records:
        rate = float(d.get("rate", 80))
        out.append({
            "id":                  d.get("department", "?"),
            "employeeId":          d.get("department", "?"),
            "firstName":           d.get("department", "Department"),
            "lastName":            "(aggregate)",
            "dept_name":           d.get("department", "Unassigned"),
            "performance_score":   rate,
            "attendance_rate":     rate,
            "late_count":          max(0, int((100 - rate) * 0.15)),
            "absence_count":       int(d.get("absent", 0)),
            "leave_days_taken":    4,
            "annual_leave_remaining": 16,
            "overtime_hours":      0,
            "half_day_count":      0,
            "prev_month_score":    rate,
            "dept_avg_performance": rate,
            "tenure_months":       24,
            "manager_change_count": 0,
            "warnings_issued":     0,
        })
    return out


# ─── Public entry point ───────────────────────────────────────────────────────

async def calculate_attrition_risk() -> dict:
    now   = datetime.now()
    month = now.month
    year  = now.year

    # Try to get real per-employee performance records
    perf_data = await _fetch(f"/performance/team?month={month}&year={year}&limit=500")

    employees: list[dict] = []
    data_source = "unknown"
    fallback = False

    if perf_data and isinstance(perf_data, list) and len(perf_data) > 0:
        employees   = _from_performance_records(perf_data)
        data_source = "performance_records"
    else:
        # Try department-level data
        dept_data = await _fetch(f"/analytics/attendance/department?month={month}&year={year}")
        if dept_data and isinstance(dept_data, list) and len(dept_data) > 0:
            employees   = _from_dept_aggregate(dept_data)
            data_source = "dept_aggregate"
        else:
            # Full fallback — synthetic
            fallback    = True
            data_source = "synthetic_fallback"
            employees   = _generate_synthetic_employees(12)

    scored = _run_ml_inference(employees)
    scored.sort(key=lambda e: e["riskScore"], reverse=True)

    high_risk   = [e for e in scored if e["riskLevel"] == "HIGH"]
    medium_risk = [e for e in scored if e["riskLevel"] == "MEDIUM"]
    low_risk    = [e for e in scored if e["riskLevel"] == "LOW"]

    clf, _ = _ModelCache.classifier()
    reg    = _ModelCache.regressor()
    ml_active = (clf is not None) or (reg is not None)

    return {
        "employees":         scored,
        "highRiskCount":     len(high_risk),
        "mediumRiskCount":   len(medium_risk),
        "lowRiskCount":      len(low_risk),
        "totalAnalyzed":     len(scored),
        "overallRiskLevel":  "HIGH" if len(high_risk) > 2 else ("MEDIUM" if high_risk else "LOW"),
        "topRiskEmployees":  scored[:5],
        "riskDistribution": {
            "high":   len(high_risk),
            "medium": len(medium_risk),
            "low":    len(low_risk),
        },
        "modelInfo": {
            "classifier": "attrition-clf-v1" if clf else "fallback",
            "regressor":  "attrition-reg-v1" if reg else "fallback",
            "mlActive":   ml_active,
            "features":   FEATURE_COLS,
        },
        "dataSource":    data_source,
        "fallback":      fallback,
        "generatedAt":   now.isoformat(),
        "month":         month,
        "year":          year,
        "algorithm":     "rf-clf + gbr-reg v1" if ml_active else "weighted-rule-fallback",
        "recommendations": list({
            r for e in high_risk for r in e.get("recommendations", [])
        })[:4],
    }


async def score_single_employee(employee_id: str, perf_record: dict) -> dict:
    """
    Per-user ML inference called by the attrition ETL job.
    perf_record is a Prisma PerformanceRecord dict from the backend.
    """
    emp = {
        "id":                   perf_record.get("userId", employee_id),
        "employeeId":           employee_id,
        "firstName":            "",
        "lastName":             "",
        "dept_name":            "Unknown",
        "performance_score":    perf_record.get("overallScore", 75),
        "attendance_rate":      perf_record.get("attendanceScore", 85),
        "late_count":           perf_record.get("lateDays", 0),
        "absence_count":        perf_record.get("absentDays", 0),
        "leave_days_taken":     perf_record.get("leaveDays", 0),
        "annual_leave_remaining": max(0, 20 - int(perf_record.get("leaveDays") or 0)),
        "overtime_hours":       max(0, float(perf_record.get("avgWorkingHours") or 8) - 8),
        "half_day_count":       0,
        "prev_month_score":     perf_record.get("prevScore", perf_record.get("overallScore", 75)),
        "dept_avg_performance": 75,
        "tenure_months":        24,
        "manager_change_count": 0,
        "warnings_issued":      0,
    }

    results = _run_ml_inference([emp])
    r = results[0]

    risk_label = r["riskLevel"]
    if r["riskScore"] >= 75:
        risk_label = "CRITICAL"

    clf, _ = _ModelCache.classifier()
    reg    = _ModelCache.regressor()
    source = "ML" if (clf is not None or reg is not None) else "DETERMINISTIC"

    return {
        "employeeId":    employee_id,
        "riskScore":     r["riskScore"],
        "riskLabel":     risk_label,
        "willLeaveProb": r.get("leaveProbability") or round(r["riskScore"] / 100 * 0.7, 4),
        "factors":       r["factors"],
        "modelVersion":  "attrition-reg-v1" if reg else "deterministic-v1",
        "source":        source,
    }


def _generate_synthetic_employees(n: int) -> list[dict]:
    import random
    random.seed(datetime.now().strftime("%Y-%m"))
    depts = ["Engineering", "Operations", "Finance", "HR", "Sales", "Support"]
    out = []
    for i in range(n):
        att  = random.uniform(62, 99)
        perf = random.uniform(50, 98)
        out.append({
            "id":                  f"SYN{i:03d}",
            "employeeId":          f"SYN{i:03d}",
            "firstName":           f"Employee",
            "lastName":            f"{i+1}",
            "dept_name":           depts[i % len(depts)],
            "performance_score":   round(perf, 1),
            "attendance_rate":     round(att, 1),
            "late_count":          random.randint(0, 10),
            "absence_count":       random.randint(0, 6),
            "leave_days_taken":    random.randint(0, 16),
            "annual_leave_remaining": random.randint(0, 20),
            "overtime_hours":      round(random.uniform(0, 20), 1),
            "half_day_count":      random.randint(0, 4),
            "prev_month_score":    round(perf + random.gauss(0, 5), 1),
            "dept_avg_performance": round(random.uniform(68, 88), 1),
            "tenure_months":       random.randint(2, 72),
            "manager_change_count": random.choices([0, 1, 2], weights=[70, 22, 8])[0],
            "warnings_issued":     random.choices([0, 1, 2], weights=[78, 16, 6])[0],
        })
    return out
