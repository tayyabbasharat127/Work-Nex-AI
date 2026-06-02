"""
WorkNex AI — Train All ML Models
Trains 3 models from the datasets in ai-service/data/:

  Model 1: Performance Predictor  → models/performance_model.pkl
  Model 2: Leave Demand Forecaster → models/leave_forecast_model.pkl
  Model 3: Anomaly Detector        → models/anomaly_model.pkl

Run: python ai-service/training/train_all_models.py
     (from the project root or ai-service/ directory)

Requirements: scikit-learn, joblib (already in requirements.txt)
"""
from __future__ import annotations

import csv
import json
import math
import pickle
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# Try importing sklearn — graceful fail if missing
# ─────────────────────────────────────────────────────────────
try:
    import joblib
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import Ridge
    from sklearn.metrics import r2_score, accuracy_score, classification_report
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    SKLEARN_OK = True
    print("[OK] scikit-learn + joblib found")
except ImportError as e:
    SKLEARN_OK = False
    print(f"[WARN] scikit-learn not available ({e}). Install with: pip install scikit-learn joblib")
    print("       Fallback deterministic artifacts will be written instead.")


# ─────────────────────────────────────────────────────────────
# CSV reader
# ─────────────────────────────────────────────────────────────
def read_csv(name: str) -> list[dict]:
    path = DATA_DIR / name
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            f"Run first: python ai-service/data/generate_datasets.py"
        )
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def fv(row: dict, keys: list[str]) -> list[float]:
    return [float(row.get(k, 0) or 0) for k in keys]


def save_model(artifact: dict, path: Path, metadata: dict):
    joblib.dump(artifact, path)
    meta_path = path.with_suffix(".json").with_stem(path.stem + "_metadata")
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"  [SAVED] {path.name}  ({metadata})")


def save_fallback(path: Path, features: list[str], reason: str):
    artifact = {"model": None, "features": features,
                "modelVersion": "deterministic-fallback", "reason": reason}
    with open(path, "wb") as f:
        pickle.dump(artifact, f)
    meta_path = path.with_suffix(".json").with_stem(path.stem + "_metadata")
    meta_path.write_text(json.dumps({
        "modelVersion": "deterministic-fallback",
        "features": features, "fallback": True, "reason": reason
    }, indent=2), encoding="utf-8")
    print(f"  [FALLBACK] {path.name} — {reason}")


# ─────────────────────────────────────────────────────────────
# MODEL 1 — Performance Predictor
# Input : 9 numerical features
# Output: performanceScore (0–100), continuous regression
# Algorithm: RandomForestRegressor (120 trees)
# ─────────────────────────────────────────────────────────────
PERF_FEATURES = [
    "attendanceRate", "lateCount", "absenceCount", "leaveCount",
    "averageWorkingHours", "previousPerformanceScore", "departmentAverage",
    "overtimeHours", "halfDayCount",
]

def train_performance_model():
    print("\n── Model 1: Performance Predictor ──────────────────")
    path = MODEL_DIR / "performance_model.pkl"
    rows = read_csv("attendance_performance_dataset.csv")
    print(f"  Rows loaded: {len(rows)}")

    X = [fv(r, PERF_FEATURES) for r in rows]
    y = [float(r["performanceScore"]) for r in rows]

    if not SKLEARN_OK:
        save_fallback(path, PERF_FEATURES, "scikit-learn not installed")
        return

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = sum(abs(p - t) for p, t in zip(preds, y_test)) / len(y_test)

    print(f"  R² score : {r2:.4f}")
    print(f"  MAE      : {mae:.2f} points")

    # Feature importances
    importances = dict(zip(PERF_FEATURES, model.feature_importances_))
    top = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:4]
    print(f"  Top features: {', '.join(f'{k}({v:.2f})' for k,v in top)}")

    artifact = {"model": model, "features": PERF_FEATURES, "modelVersion": "performance-rf-v2"}
    meta = {
        "modelVersion": "performance-rf-v2",
        "modelType": "RandomForestRegressor",
        "features": PERF_FEATURES,
        "rows": len(rows),
        "r2Score": round(r2, 4),
        "mae": round(mae, 2),
        "fallback": False,
        "featureImportances": {k: round(v, 4) for k, v in importances.items()},
    }
    save_model(artifact, path, {"modelVersion": "performance-rf-v2", "r2Score": round(r2, 4), "rows": len(rows)})

    # Also write metadata in the format the service expects
    (MODEL_DIR / "performance_model_metadata.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    print(f"  [SAVED] performance_model_metadata.json")


# ─────────────────────────────────────────────────────────────
# MODEL 2 — Leave Demand Forecaster
# Input : day features (dow, month, flags, rolling avg)
# Output: totalLeavesApproved (count), regression
# Algorithm: GradientBoostingRegressor
# ─────────────────────────────────────────────────────────────
FORECAST_FEATURES = [
    "dayOfWeek", "month", "weekOfYear", "isWeekend",
    "isPublicHoliday", "isEidSeason", "isRamadan",
    "isSummer", "isYearEnd", "isMonday", "isFriday",
    "prevWeekDailyAvgLeaves", "rollingAvg14Days", "monthLeaveFactor",
]

def train_leave_forecast_model():
    print("\n── Model 2: Leave Demand Forecaster ────────────────")
    path = MODEL_DIR / "leave_forecast_model.pkl"
    rows = read_csv("leave_forecast_dataset.csv")
    print(f"  Rows loaded: {len(rows)}")

    X = [fv(r, FORECAST_FEATURES) for r in rows]
    y = [float(r["totalLeavesApproved"]) for r in rows]

    if not SKLEARN_OK:
        save_fallback(path, FORECAST_FEATURES, "scikit-learn not installed")
        return

    from sklearn.ensemble import GradientBoostingRegressor

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        min_samples_leaf=4,
        random_state=42,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    preds_clipped = [max(0, p) for p in preds]
    r2 = r2_score(y_test, preds_clipped)
    mae = sum(abs(p - t) for p, t in zip(preds_clipped, y_test)) / len(y_test)

    print(f"  R² score : {r2:.4f}")
    print(f"  MAE      : {mae:.2f} leaves/day")

    importances = dict(zip(FORECAST_FEATURES, model.feature_importances_))
    top = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:4]
    print(f"  Top features: {', '.join(f'{k}({v:.2f})' for k,v in top)}")

    artifact = {"model": model, "features": FORECAST_FEATURES, "modelVersion": "forecast-gbr-v1"}
    meta = {
        "modelVersion": "forecast-gbr-v1",
        "modelType": "GradientBoostingRegressor",
        "features": FORECAST_FEATURES,
        "rows": len(rows),
        "r2Score": round(r2, 4),
        "mae": round(mae, 2),
        "fallback": False,
        "featureImportances": {k: round(v, 4) for k, v in importances.items()},
    }
    save_model(artifact, path, {"modelVersion": "forecast-gbr-v1", "r2Score": round(r2, 4), "rows": len(rows)})
    (MODEL_DIR / "leave_forecast_model_metadata.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    print(f"  [SAVED] leave_forecast_model_metadata.json")


# ─────────────────────────────────────────────────────────────
# MODEL 3 — Anomaly Detector
# Input : attendance behaviour features
# Output: isAnomaly (0/1), classification
# Algorithm: RandomForestClassifier
# ─────────────────────────────────────────────────────────────
ANOMALY_FEATURES = [
    "attendanceRate30Days", "lateCountThisMonth", "absenceCountThisMonth",
    "checkInHourAvg", "checkInStdDev", "mondayAbsenceRate", "fridayAbsenceRate",
    "consecutiveLateMax", "earlyCheckoutCount", "avgWorkingHours",
]

def train_anomaly_model():
    print("\n── Model 3: Anomaly Detector ───────────────────────")
    path = MODEL_DIR / "anomaly_model.pkl"
    rows = read_csv("anomaly_detection_dataset.csv")
    print(f"  Rows loaded: {len(rows)}")

    X = [fv(r, ANOMALY_FEATURES) for r in rows]
    y_binary = [int(r["isAnomaly"]) for r in rows]
    y_type = [r["anomalyType"] for r in rows]

    if not SKLEARN_OK:
        save_fallback(path, ANOMALY_FEATURES, "scikit-learn not installed")
        return

    le = LabelEncoder()
    y_encoded = le.fit_transform(y_type)

    X_train, X_test, yb_train, yb_test, yt_train, yt_test = train_test_split(
        X, y_binary, y_encoded, test_size=0.2, random_state=42
    )

    # Binary classifier: anomaly or not
    clf_binary = RandomForestClassifier(
        n_estimators=150, max_depth=10, min_samples_leaf=3,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    clf_binary.fit(X_train, yb_train)
    preds_binary = clf_binary.predict(X_test)
    acc_binary = accuracy_score(yb_test, preds_binary)
    print(f"  Binary accuracy: {acc_binary:.4f}")

    # Multi-class classifier: anomaly type
    clf_type = RandomForestClassifier(
        n_estimators=150, max_depth=10, min_samples_leaf=3,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    clf_type.fit(X_train, yt_train)
    preds_type = clf_type.predict(X_test)
    acc_type = accuracy_score(yt_test, preds_type)
    print(f"  Type accuracy  : {acc_type:.4f}")
    print(f"  Classes        : {list(le.classes_)}")

    importances = dict(zip(ANOMALY_FEATURES, clf_binary.feature_importances_))
    top = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:4]
    print(f"  Top features: {', '.join(f'{k}({v:.2f})' for k,v in top)}")

    artifact = {
        "model": clf_binary,
        "typeModel": clf_type,
        "labelEncoder": le,
        "features": ANOMALY_FEATURES,
        "classes": list(le.classes_),
        "modelVersion": "anomaly-rf-v1",
    }
    meta = {
        "modelVersion": "anomaly-rf-v1",
        "modelType": "RandomForestClassifier",
        "features": ANOMALY_FEATURES,
        "classes": list(le.classes_),
        "rows": len(rows),
        "binaryAccuracy": round(acc_binary, 4),
        "typeAccuracy": round(acc_type, 4),
        "fallback": False,
        "featureImportances": {k: round(v, 4) for k, v in importances.items()},
    }
    save_model(artifact, path, {"modelVersion": "anomaly-rf-v1", "accuracy": round(acc_binary, 4), "rows": len(rows)})
    (MODEL_DIR / "anomaly_model_metadata.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    print(f"  [SAVED] anomaly_model_metadata.json")


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nWorkNex AI — Training All Models")
    print("="*45)
    print(f"Data dir  : {DATA_DIR}")
    print(f"Model dir : {MODEL_DIR}")

    errors = []
    for fn, label in [
        (train_performance_model, "Performance Predictor"),
        (train_leave_forecast_model, "Leave Forecaster"),
        (train_anomaly_model, "Anomaly Detector"),
    ]:
        try:
            fn()
        except FileNotFoundError as e:
            print(f"\n  [ERROR] {label}: {e}")
            errors.append(label)
        except Exception as e:
            print(f"\n  [ERROR] {label}: {e}")
            errors.append(label)

    print("\n" + "="*45)
    if errors:
        print(f"[DONE with errors] Failed: {errors}")
        print("Generate datasets first: python ai-service/data/generate_datasets.py")
    else:
        print("[DONE] All 3 models trained and saved.")
        print("\nModels saved to ai-service/models/:")
        for f in sorted(MODEL_DIR.glob("*.pkl")):
            print(f"  {f.name}")
