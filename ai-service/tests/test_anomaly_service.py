"""
Anomaly detection — unit tests
Run: cd ai-service && pytest tests/test_anomaly_service.py -v
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest


class TestZScore:
    def test_z_score_zero_when_at_mean(self):
        from app.services.anomaly_service import _z_score
        assert _z_score(10, 10, 2) == 0.0

    def test_z_score_positive_above_mean(self):
        from app.services.anomaly_service import _z_score
        assert _z_score(14, 10, 2) == 2.0

    def test_z_score_zero_when_std_is_zero(self):
        from app.services.anomaly_service import _z_score
        # std = 0 means no variance — return 0 to avoid division by zero
        assert _z_score(10, 10, 0) == 0.0


class TestSeverity:
    def test_high_severity_at_threshold(self):
        from app.services.anomaly_service import _severity
        assert _severity(2.5) == "HIGH"
        assert _severity(3.5) == "HIGH"

    def test_medium_severity(self):
        from app.services.anomaly_service import _severity
        assert _severity(1.5) == "MEDIUM"
        assert _severity(2.4) == "MEDIUM"

    def test_low_severity_below_threshold(self):
        from app.services.anomaly_service import _severity
        assert _severity(1.0) == "LOW"
        assert _severity(0.5) == "LOW"


class TestAnalyseTrendData:
    def _make_trend(self, absent_vals, late_vals=None):
        """Build minimal trend data list."""
        dates = [f"2026-06-{str(i+1).zfill(2)}" for i in range(len(absent_vals))]
        return [
            {
                "date":    d,
                "ABSENT":  str(a),
                "LATE":    str(l),
                "PRESENT": "10",
            }
            for d, a, l in zip(dates, absent_vals, late_vals or [0] * len(absent_vals))
        ]

    def test_spike_detected(self):
        from app.services.anomaly_service import _analyse_trend_data
        # Normal days: 2 absences, then a spike of 20
        trend = self._make_trend([2, 2, 2, 2, 2, 2, 2, 20])
        anomalies = _analyse_trend_data(trend)
        types = [a["type"] for a in anomalies]
        assert "ABSENCE_SPIKE" in types

    def test_no_anomaly_on_flat_data(self):
        from app.services.anomaly_service import _analyse_trend_data
        trend = self._make_trend([3, 3, 3, 3, 3, 3, 3, 3])
        anomalies = _analyse_trend_data(trend)
        # Flat data → std dev ≈ 0 → no z-score anomalies
        absence_spikes = [a for a in anomalies if a["type"] == "ABSENCE_SPIKE"]
        assert len(absence_spikes) == 0

    def test_returns_at_most_8_anomalies(self):
        from app.services.anomaly_service import _analyse_trend_data
        # All days are spikes — should still cap at 8
        trend = self._make_trend([1, 50, 1, 50, 1, 50, 1, 50, 1, 50])
        anomalies = _analyse_trend_data(trend)
        assert len(anomalies) <= 8

    def test_returns_empty_for_too_few_points(self):
        from app.services.anomaly_service import _analyse_trend_data
        trend = self._make_trend([5, 10])
        anomalies = _analyse_trend_data(trend)
        assert anomalies == []


@pytest.mark.asyncio
class TestDetectAnomalies:
    async def test_returns_required_keys(self):
        from app.services.anomaly_service import detect_anomalies
        result = await detect_anomalies()
        for key in ["anomalies", "count", "analysisDate", "algorithm", "fallback"]:
            assert key in result, f"Missing key: {key}"

    async def test_count_matches_anomalies_length(self):
        from app.services.anomaly_service import detect_anomalies
        result = await detect_anomalies()
        assert result["count"] == len(result["anomalies"])
