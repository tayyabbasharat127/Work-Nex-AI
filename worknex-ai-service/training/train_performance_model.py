"""Train WorkNex performance prediction model.

Uses scikit-learn RandomForestRegressor when available. If sklearn is not
installed, writes a deterministic demo artifact so local demo commands still
complete and the API can report fallback behavior clearly.
"""
from __future__ import annotations

import csv
import json
import math
import os
import pickle
import random
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "performance_model.pkl"
METADATA_PATH = MODEL_DIR / "performance_model_metadata.json"

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


def synthetic_dataset(rows: int = 350) -> tuple[list[list[float]], list[float]]:
    random.seed(42)
    x_rows: list[list[float]] = []
    y_rows: list[float] = []
    for _ in range(rows):
        attendance_rate = random.uniform(62, 99)
        late_count = random.randint(0, 12)
        absence_count = random.randint(0, 8)
        leave_count = random.randint(0, 8)
        avg_hours = random.uniform(5.5, 9.8)
        previous_score = random.uniform(55, 98)
        dept_avg = random.uniform(68, 94)
        overtime = random.uniform(0, 18)
        half_days = random.randint(0, 5)

        score = (
            0.33 * attendance_rate
            + 0.26 * previous_score
            + 0.18 * dept_avg
            + 2.3 * avg_hours
            + 0.35 * min(overtime, 10)
            - 1.5 * late_count
            - 2.2 * absence_count
            - 0.7 * leave_count
            - 1.4 * half_days
            + random.uniform(-4, 4)
        )
        x_rows.append([
            attendance_rate,
            late_count,
            absence_count,
            leave_count,
            avg_hours,
            previous_score,
            dept_avg,
            overtime,
            half_days,
        ])
        y_rows.append(round(max(0, min(100, score)), 2))
    return x_rows, y_rows


def load_csv_dataset(path: str) -> tuple[list[list[float]], list[float]]:
    x_rows: list[list[float]] = []
    y_rows: list[float] = []
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            x_rows.append([float(row.get(feature, 0) or 0) for feature in FEATURES])
            y_rows.append(float(row.get("performanceScore", 0) or 0))
    if not x_rows:
        raise ValueError("Training CSV has no rows")
    return x_rows, y_rows


def write_metadata(model_type: str, rows: int, r2_score: float | None, fallback: bool) -> None:
    METADATA_PATH.write_text(json.dumps({
        "modelVersion": "performance-rf-v1",
        "modelType": model_type,
        "features": FEATURES,
        "rows": rows,
        "r2Score": r2_score,
        "fallback": fallback,
    }, indent=2), encoding="utf-8")


def train() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    source = os.getenv("PERFORMANCE_TRAINING_CSV")
    x_rows, y_rows = load_csv_dataset(source) if source else synthetic_dataset()

    try:
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.metrics import r2_score
        from sklearn.model_selection import train_test_split
        import joblib

        train_x, test_x, train_y, test_y = train_test_split(x_rows, y_rows, test_size=0.2, random_state=42)
        model = RandomForestRegressor(n_estimators=120, random_state=42, min_samples_leaf=3)
        model.fit(train_x, train_y)
        predictions = model.predict(test_x)
        score = float(r2_score(test_y, predictions)) if len(test_y) > 1 else math.nan
        joblib.dump({"model": model, "features": FEATURES, "modelVersion": "performance-rf-v1"}, MODEL_PATH)
        write_metadata("RandomForestRegressor", len(x_rows), round(score, 4), False)
        print(f"trained RandomForestRegressor -> {MODEL_PATH}")
    except ModuleNotFoundError as exc:
        artifact = {
            "model": None,
            "features": FEATURES,
            "modelVersion": "performance-deterministic-fallback-v1",
            "reason": f"Missing optional training dependency: {exc.name}",
        }
        with open(MODEL_PATH, "wb") as handle:
            pickle.dump(artifact, handle)
        write_metadata("deterministic-fallback", len(x_rows), None, True)
        print(f"sklearn unavailable; wrote deterministic fallback artifact -> {MODEL_PATH}")


if __name__ == "__main__":
    train()
