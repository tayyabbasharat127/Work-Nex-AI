"""
WorkNex AI — Attrition Risk Model Trainer
==========================================
Trains TWO models:
  1. Binary Classifier  (RandomForestClassifier)  → will_leave: 0/1
  2. Risk Regressor     (GradientBoostingRegressor) → risk_score: 0-100

Outputs (saved to ai-service/models/):
  attrition_classifier.pkl        — binary leave/stay model
  attrition_regressor.pkl         — continuous risk score model
  attrition_classifier_metadata.json
  attrition_regressor_metadata.json

Usage:
  # Generate dataset first
  python ai-service/data/generate_attrition_dataset.py
  # Then train
  python ai-service/training/train_attrition_model.py
  # Or use env var for real CSV:
  ATTRITION_TRAINING_CSV=/path/to/real.csv python ...
"""
from __future__ import annotations

import csv
import json
import math
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR  = ROOT / "data"
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

CLASSIFIER_PATH = MODEL_DIR / "attrition_classifier.pkl"
REGRESSOR_PATH  = MODEL_DIR / "attrition_regressor.pkl"

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


# ─── sklearn imports ──────────────────────────────────────────────────────────
try:
    import joblib
    from sklearn.ensemble import (
        GradientBoostingClassifier,
        GradientBoostingRegressor,
        RandomForestClassifier,
        RandomForestRegressor,
    )
    from sklearn.inspection import permutation_importance
    from sklearn.metrics import (
        accuracy_score,
        classification_report,
        f1_score,
        mean_absolute_error,
        r2_score,
        roc_auc_score,
    )
    from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
    from sklearn.preprocessing import StandardScaler
    SKLEARN_OK = True
except ImportError as _e:
    SKLEARN_OK = False
    print(f"[WARN] scikit-learn not available: {_e}")


# ─── Data loading ─────────────────────────────────────────────────────────────

def load_dataset(path: str) -> tuple[list[list[float]], list[int], list[float]]:
    """Return X (features), y_label (0/1), y_risk (0-100)."""
    X, y_label, y_risk = [], [], []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            X.append([float(row.get(c, 0) or 0) for c in FEATURE_COLS])
            y_label.append(int(float(row.get("attrition_label", 0) or 0)))
            y_risk.append(float(row.get("attrition_risk", 0) or 0))
    if not X:
        raise ValueError("Dataset is empty")
    return X, y_label, y_risk


def resolve_dataset() -> str:
    env = os.getenv("ATTRITION_TRAINING_CSV")
    if env and Path(env).exists():
        print(f"[INFO] Using external dataset: {env}")
        return env
    default = DATA_DIR / "attrition_dataset.csv"
    if not default.exists():
        print("[INFO] Dataset not found — generating synthetic dataset...")
        sys.path.insert(0, str(DATA_DIR))
        import generate_attrition_dataset
        generate_attrition_dataset.main(3000)
    return str(default)


# ─── Metadata helper ──────────────────────────────────────────────────────────

def _save_meta(path: Path, data: dict) -> None:
    meta_path = path.parent / f"{path.stem}_metadata.json"
    meta_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"  [META] {meta_path.name}")


# ─── MODEL 1: Binary Classifier ───────────────────────────────────────────────

def train_classifier(X_tr, X_te, y_tr, y_te, X_all, y_all) -> None:
    print("\n─── Model 1: Attrition Classifier (Binary) ───")

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=14,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_tr, y_tr)

    y_pred  = clf.predict(X_te)
    y_proba = clf.predict_proba(X_te)[:, 1]

    acc     = accuracy_score(y_te, y_pred)
    f1      = f1_score(y_te, y_pred, zero_division=0)
    auc     = roc_auc_score(y_te, y_proba) if len(set(y_te)) > 1 else math.nan

    print(f"  Accuracy : {acc:.4f}")
    print(f"  F1 Score : {f1:.4f}")
    print(f"  ROC-AUC  : {auc:.4f}" if not math.isnan(auc) else "  ROC-AUC : N/A")
    print(classification_report(y_te, y_pred, target_names=["stayed", "left"], zero_division=0))

    # 5-fold CV AUC
    cv_scores = cross_val_score(clf, X_all, y_all, cv=StratifiedKFold(5, shuffle=True, random_state=42),
                                scoring="roc_auc", n_jobs=-1)
    print(f"  CV AUC (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    importances = dict(zip(FEATURE_COLS, clf.feature_importances_))
    top = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"  Top features: {', '.join(f'{k}({v:.3f})' for k,v in top)}")

    artifact = {
        "model": clf,
        "features": FEATURE_COLS,
        "modelVersion": "attrition-clf-v1",
        "task": "binary_classification",
        "threshold": 0.45,
    }
    joblib.dump(artifact, CLASSIFIER_PATH)
    _save_meta(CLASSIFIER_PATH, {
        "modelVersion": "attrition-clf-v1",
        "modelType": "RandomForestClassifier",
        "task": "binary_classification",
        "features": FEATURE_COLS,
        "rows": len(X_all),
        "accuracy": round(acc, 4),
        "f1Score": round(f1, 4),
        "rocAuc": round(auc, 4) if not math.isnan(auc) else None,
        "cvAucMean": round(float(cv_scores.mean()), 4),
        "cvAucStd": round(float(cv_scores.std()), 4),
        "threshold": 0.45,
        "featureImportances": {k: round(v, 4) for k, v in importances.items()},
        "fallback": False,
    })
    print(f"  [SAVED] {CLASSIFIER_PATH.name}")


# ─── MODEL 2: Risk Score Regressor ────────────────────────────────────────────

def train_regressor(X_tr, X_te, y_tr, y_te, X_all, y_all) -> None:
    print("\n─── Model 2: Attrition Risk Regressor (0-100) ───")

    reg = GradientBoostingRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.07,
        min_samples_leaf=5,
        subsample=0.85,
        random_state=42,
    )
    reg.fit(X_tr, y_tr)

    y_pred = reg.predict(X_te)
    y_pred = [max(0, min(100, p)) for p in y_pred]

    r2  = r2_score(y_te, y_pred)
    mae = mean_absolute_error(y_te, y_pred)

    print(f"  R² Score : {r2:.4f}")
    print(f"  MAE      : {mae:.2f} risk points")

    importances = dict(zip(FEATURE_COLS, reg.feature_importances_))
    top = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"  Top features: {', '.join(f'{k}({v:.3f})' for k,v in top)}")

    artifact = {
        "model": reg,
        "features": FEATURE_COLS,
        "modelVersion": "attrition-reg-v1",
        "task": "risk_regression",
    }
    joblib.dump(artifact, REGRESSOR_PATH)
    _save_meta(REGRESSOR_PATH, {
        "modelVersion": "attrition-reg-v1",
        "modelType": "GradientBoostingRegressor",
        "task": "risk_regression",
        "features": FEATURE_COLS,
        "rows": len(X_all),
        "r2Score": round(r2, 4),
        "mae": round(mae, 2),
        "featureImportances": {k: round(v, 4) for k, v in importances.items()},
        "fallback": False,
    })
    print(f"  [SAVED] {REGRESSOR_PATH.name}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("WorkNex AI — Attrition Model Training")
    print("=" * 50)

    if not SKLEARN_OK:
        print("[ERROR] scikit-learn not installed. Run: pip install scikit-learn joblib")
        sys.exit(1)

    csv_path = resolve_dataset()
    print(f"[INFO] Loading dataset: {csv_path}")
    X, y_label, y_risk = load_dataset(csv_path)
    print(f"[INFO] Rows: {len(X)} | Features: {len(FEATURE_COLS)}")
    print(f"[INFO] Attrition rate: {sum(y_label)/len(y_label)*100:.1f}%")

    # Split
    X_tr_clf, X_te_clf, y_tr_clf, y_te_clf = train_test_split(
        X, y_label, test_size=0.2, random_state=42, stratify=y_label
    )
    X_tr_reg, X_te_reg, y_tr_reg, y_te_reg = train_test_split(
        X, y_risk, test_size=0.2, random_state=42
    )

    train_classifier(X_tr_clf, X_te_clf, y_tr_clf, y_te_clf, X, y_label)
    train_regressor(X_tr_reg, X_te_reg, y_tr_reg, y_te_reg, X, y_risk)

    print("\n" + "=" * 50)
    print("[DONE] Saved to ai-service/models/:")
    for f in sorted(MODEL_DIR.glob("attrition*")):
        size = f.stat().st_size / 1024
        print(f"  {f.name:50s}  {size:6.1f} KB")


if __name__ == "__main__":
    main()
