"""Performance prediction service."""
from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "performance_model.pkl"
METADATA_PATH = ROOT / "models" / "performance_model_metadata.json"

FEATURES = [
    "attendanceRate",
    "lateCount",
    "absenceCount",
    "leaveCount",
    "averageWorkingHours",
    "previousPerformanceScore",
    "departmentAverage",
    "overtimeHours",
    "halfDayCount",
]


def _feature_vector(features: dict[str, Any]) -> list[float]:
    return [float(features.get(name, 0) or 0) for name in FEATURES]


def _deterministic_score(features: dict[str, Any]) -> float:
    attendance = float(features.get("attendanceRate", 0) or 0)
    late = float(features.get("lateCount", 0) or 0)
    absent = float(features.get("absenceCount", 0) or 0)
    leave = float(features.get("leaveCount", 0) or 0)
    hours = float(features.get("averageWorkingHours", 0) or 0)
    previous = float(features.get("previousPerformanceScore", 75) or 75)
    dept = float(features.get("departmentAverage", 75) or 75)
    overtime = min(float(features.get("overtimeHours", 0) or 0), 10)
    half_days = float(features.get("halfDayCount", 0) or 0)
    score = (
        0.32 * attendance
        + 0.24 * previous
        + 0.16 * dept
        + 2.5 * hours
        + 0.4 * overtime
        - 1.4 * late
        - 2.1 * absent
        - 0.6 * leave
        - 1.2 * half_days
    )
    return round(max(0, min(100, score)), 2)


def _risk_level(score: float) -> str:
    if score < 55:
        return "HIGH"
    if score < 72:
        return "MEDIUM"
    return "LOW"


def _reasons(features: dict[str, Any], score: float) -> list[str]:
    reasons: list[str] = []
    if float(features.get("attendanceRate", 0) or 0) < 80:
        reasons.append("Attendance rate is below the target range.")
    if float(features.get("lateCount", 0) or 0) >= 4:
        reasons.append("Repeated late arrivals are reducing the projected score.")
    if float(features.get("absenceCount", 0) or 0) >= 3:
        reasons.append("Absence count is elevated for the current period.")
    if float(features.get("averageWorkingHours", 0) or 0) < 7:
        reasons.append("Average working hours are below the expected daily baseline.")
    if float(features.get("previousPerformanceScore", 0) or 0) >= 85:
        reasons.append("Previous performance score positively supports the forecast.")
    if not reasons:
        reasons.append("Prediction is primarily driven by stable attendance and performance history.")
    reasons.append(f"Projected score falls in the {_risk_level(score).lower()} risk band.")
    return reasons


def predict_performance(employee_id: str, features: dict[str, Any]) -> dict[str, Any]:
    fallback = True
    model_version = "performance-deterministic-fallback-v1"
    predicted = _deterministic_score(features)
    confidence = 0.62

    if MODEL_PATH.exists():
        try:
            try:
                import joblib
                artifact = joblib.load(MODEL_PATH)
            except Exception:
                with open(MODEL_PATH, "rb") as handle:
                    artifact = pickle.load(handle)
            model = artifact.get("model") if isinstance(artifact, dict) else artifact
            if model is not None:
                predicted = round(float(model.predict([_feature_vector(features)])[0]), 2)
                fallback = False
                confidence = 0.82
            model_version = artifact.get("modelVersion", model_version) if isinstance(artifact, dict) else model_version
        except Exception:
            fallback = True

    if METADATA_PATH.exists():
      try:
          metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
          model_version = metadata.get("modelVersion", model_version)
      except Exception:
          pass

    return {
        "employeeId": employee_id,
        "predictedScore": predicted,
        "riskLevel": _risk_level(predicted),
        "confidence": confidence,
        "reasons": _reasons(features, predicted),
        "featuresUsed": {name: features.get(name, 0) for name in FEATURES},
        "modelVersion": model_version,
        "fallback": fallback,
    }
