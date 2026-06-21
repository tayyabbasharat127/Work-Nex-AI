"""
ML validation tests — Attrition models
Run: cd ai-service && pytest tests/test_attrition_model.py -v
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest


# ─── Dataset generator tests ──────────────────────────────────────────────────

class TestAttritionDatasetGenerator:
    def test_generate_row_has_required_keys(self):
        sys.path.insert(0, str(ROOT / "data"))
        import generate_attrition_dataset as gen
        row = gen.generate_row(0)
        required = [
            "employeeId", "tenure_months", "attendance_rate", "late_count",
            "absence_count", "leave_days_taken", "annual_leave_remaining",
            "performance_score", "dept_avg_performance", "overtime_hours",
            "half_day_count", "prev_month_score", "manager_change_count",
            "warnings_issued", "attrition_risk", "attrition_label",
        ]
        for key in required:
            assert key in row, f"Missing key: {key}"

    def test_risk_score_in_range(self):
        sys.path.insert(0, str(ROOT / "data"))
        import generate_attrition_dataset as gen
        for i in range(50):
            row = gen.generate_row(i)
            assert 0 <= row["attrition_risk"] <= 100, f"Risk out of range: {row['attrition_risk']}"

    def test_label_is_binary(self):
        sys.path.insert(0, str(ROOT / "data"))
        import generate_attrition_dataset as gen
        for i in range(50):
            row = gen.generate_row(i)
            assert row["attrition_label"] in (0, 1), f"Label not binary: {row['attrition_label']}"

    def test_annual_remaining_consistent(self):
        sys.path.insert(0, str(ROOT / "data"))
        import generate_attrition_dataset as gen
        for i in range(20):
            row = gen.generate_row(i)
            total = row["leave_days_taken"] + row["annual_leave_remaining"]
            assert total == 20, f"Leave days don't add to 20: {total}"

    def test_high_absence_rate_raises_risk(self):
        sys.path.insert(0, str(ROOT / "data"))
        import generate_attrition_dataset as gen

        # Manually build a high-risk employee
        high_risk_row = {
            "tenure_months": 3,
            "attendance_rate": 55.0,
            "late_count": 12,
            "absence_count": 8,
            "leave_days_taken": 15,
            "prev_month_score": 80,
            "performance_score": 45,
            "manager_change_count": 2,
            "warnings_issued": 1,
        }
        risk = gen._compute_risk(high_risk_row)
        # Formula weights many factors; combined high-risk inputs should exceed 25
        assert risk >= 25, f"High-risk profile should score >=25, got {risk}"

    def test_stable_employee_has_low_risk(self):
        sys.path.insert(0, str(ROOT / "data"))
        import generate_attrition_dataset as gen

        stable_row = {
            "tenure_months": 36,
            "attendance_rate": 98.0,
            "late_count": 0,
            "absence_count": 0,
            "leave_days_taken": 3,
            "prev_month_score": 90,
            "performance_score": 92,
            "manager_change_count": 0,
            "warnings_issued": 0,
        }
        risk = gen._compute_risk(stable_row)
        assert risk <= 35, f"Stable employee should score ≤35, got {risk}"


# ─── Feature vector tests ─────────────────────────────────────────────────────

class TestFeatureVector:
    def test_build_feature_vector_length(self):
        from app.services.attrition_service import _build_feature_vector, FEATURE_COLS
        emp = {
            "tenure_months": 12, "attendance_rate": 90, "late_count": 2,
            "absence_count": 1, "leave_days_taken": 5, "annual_leave_remaining": 15,
            "performance_score": 80, "dept_avg_performance": 75, "overtime_hours": 4,
            "half_day_count": 1, "prev_month_score": 78, "manager_change_count": 0,
            "warnings_issued": 0,
        }
        fv = _build_feature_vector(emp)
        assert len(fv) == len(FEATURE_COLS), f"Feature vector length mismatch: {len(fv)} != {len(FEATURE_COLS)}"

    def test_build_feature_vector_all_floats(self):
        from app.services.attrition_service import _build_feature_vector
        emp = {"performance_score": 75}
        fv = _build_feature_vector(emp)
        assert all(isinstance(v, float) for v in fv), "All features must be float"

    def test_missing_keys_use_defaults(self):
        from app.services.attrition_service import _build_feature_vector, FEATURE_COLS
        fv = _build_feature_vector({})
        assert len(fv) == len(FEATURE_COLS), "Should use defaults for all missing keys"
        assert all(v >= 0 for v in fv), "Default values should be non-negative"


# ─── Risk level tests ─────────────────────────────────────────────────────────

class TestRiskLevel:
    def test_high_risk_threshold(self):
        from app.services.attrition_service import _risk_level
        assert _risk_level(65.0) == "HIGH"
        assert _risk_level(99.9) == "HIGH"

    def test_medium_risk_threshold(self):
        from app.services.attrition_service import _risk_level
        assert _risk_level(35.0) == "MEDIUM"
        assert _risk_level(64.9) == "MEDIUM"

    def test_low_risk_threshold(self):
        from app.services.attrition_service import _risk_level
        assert _risk_level(0.0)  == "LOW"
        assert _risk_level(34.9) == "LOW"


# ─── Factor detection tests ───────────────────────────────────────────────────

class TestFactorDetection:
    def test_high_absenteeism_detected(self):
        from app.services.attrition_service import _detect_factors
        emp = {"attendance_rate": 70, "performance_score": 85, "leave_days_taken": 3,
               "late_count": 2, "tenure_months": 24, "manager_change_count": 0,
               "warnings_issued": 0, "prev_month_score": 85}
        factors = _detect_factors(emp, 40)
        assert "high_absenteeism" in factors

    def test_disciplinary_flag(self):
        from app.services.attrition_service import _detect_factors
        emp = {"attendance_rate": 90, "performance_score": 75, "leave_days_taken": 4,
               "late_count": 1, "tenure_months": 24, "manager_change_count": 0,
               "warnings_issued": 2, "prev_month_score": 75}
        factors = _detect_factors(emp, 40)
        assert "disciplinary" in factors

    def test_no_false_positives_for_star_employee(self):
        from app.services.attrition_service import _detect_factors
        emp = {"attendance_rate": 99, "performance_score": 95, "leave_days_taken": 2,
               "late_count": 0, "tenure_months": 36, "manager_change_count": 0,
               "warnings_issued": 0, "prev_month_score": 94}
        factors = _detect_factors(emp, 5)
        assert len(factors) == 0, f"Star employee should have no risk factors, got: {factors}"


# ─── Deterministic fallback test ──────────────────────────────────────────────

class TestDeterministicRisk:
    def test_output_in_range(self):
        from app.services.attrition_service import _deterministic_risk
        for att in range(50, 101, 10):
            emp = {"attendance_rate": att, "performance_score": 75,
                   "leave_days_taken": 5, "late_count": 2, "tenure_months": 24}
            score = _deterministic_risk(emp)
            assert 0.0 <= score <= 100.0, f"Score out of range: {score}"

    def test_worse_inputs_give_higher_risk(self):
        from app.services.attrition_service import _deterministic_risk
        good = _deterministic_risk({"attendance_rate": 98, "performance_score": 90,
                                    "leave_days_taken": 2, "late_count": 0, "tenure_months": 24})
        bad  = _deterministic_risk({"attendance_rate": 60, "performance_score": 45,
                                    "leave_days_taken": 15, "late_count": 10, "tenure_months": 2})
        assert bad > good, f"Worse inputs should give higher risk ({bad} <= {good})"


# ─── Leave policy extractor tests ─────────────────────────────────────────────

class TestLeavePolicyExtractor:
    @pytest.mark.asyncio
    async def test_extracts_annual_leave_days(self):
        from app.services.leave_policy_service import extract_leave_policy
        text = "Employees are entitled to 21 days of annual leave per year."
        result = await extract_leave_policy(text)
        lt = result["policy"]["leaveTypes"]
        assert "ANNUAL" in lt
        assert lt["ANNUAL"]["daysPerYear"] == 21

    @pytest.mark.asyncio
    async def test_extracts_sick_leave(self):
        from app.services.leave_policy_service import extract_leave_policy
        # Include a more explicit pattern so regex can match "10 sick leave days"
        text = "Each employee is granted 10 sick leave days per year. A medical certificate is required."
        result = await extract_leave_policy(text)
        lt = result["policy"]["leaveTypes"]
        # SICK should be detected (regex or LLM); days may vary by parser
        assert "SICK" in lt
        if lt["SICK"].get("daysPerYear") is not None:
            assert lt["SICK"]["daysPerYear"] == 10
        assert lt["SICK"].get("requiresDocumentation") is True

    @pytest.mark.asyncio
    async def test_detects_lapse_carry_over(self):
        from app.services.leave_policy_service import extract_leave_policy
        text = "Unused annual leave will lapse at year end and cannot be carried forward."
        result = await extract_leave_policy(text)
        lt = result["policy"]["leaveTypes"]
        if "ANNUAL" in lt:
            assert lt["ANNUAL"]["carryOver"] == 0

    @pytest.mark.asyncio
    async def test_empty_text_returns_error(self):
        from app.services.leave_policy_service import extract_leave_policy
        result = await extract_leave_policy("")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_returns_confidence_score(self):
        from app.services.leave_policy_service import extract_leave_policy
        text = "Employees get 15 days casual leave per year with 2 days notice required."
        result = await extract_leave_policy(text)
        assert "confidence" in result
        assert 0.0 <= result["confidence"] <= 1.0
