"""
Tests for dynamic tolerance engine.
"""

import pytest
from backend.tolerance import DynamicToleranceEngine
from backend.models import BatchProfile, NormalizedRecord


def _make_record(amount):
    return NormalizedRecord(
        id="test", source="settlement", amount=str(amount), type="payment",
    )


class TestDynamicTolerance:
    def test_micro_profile(self):
        engine = DynamicToleranceEngine()
        records = [_make_record(100) for _ in range(10)]
        profile = engine.analyze(records)
        assert profile.profile_type == BatchProfile.MICRO
        assert profile.tolerance_config.confidence_threshold == "0.80"

    def test_high_value_profile(self):
        engine = DynamicToleranceEngine()
        records = [_make_record(500000) for _ in range(10)]
        profile = engine.analyze(records)
        assert profile.profile_type == BatchProfile.HIGH_VALUE
        assert profile.tolerance_config.confidence_threshold == "0.95"

    def test_standard_profile(self):
        engine = DynamicToleranceEngine()
        records = [_make_record(10000) for _ in range(10)]
        profile = engine.analyze(records)
        assert profile.profile_type == BatchProfile.STANDARD

    def test_empty_records(self):
        engine = DynamicToleranceEngine()
        profile = engine.analyze([])
        assert profile.transaction_count == 0
