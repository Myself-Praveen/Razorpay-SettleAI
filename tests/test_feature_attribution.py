"""
Tests for feature attribution computation.
"""

import pytest
from backend.agents.fuzzy_matcher import _compute_feature_attribution
from backend.models import NormalizedRecord, RecordSource
from datetime import datetime


def _make_record(id, amount, method="card", source="settlement", **kwargs):
    return NormalizedRecord(
        id=id, source=source, amount=str(amount),
        type="payment", method=method, **kwargs,
    )


class TestFeatureAttribution:
    def test_exact_match_attribution(self):
        a = _make_record("s1", 10000, method="card")
        b = _make_record("o1", 10000, method="card", source="order")

        attr = _compute_feature_attribution(a, b)
        assert attr.confidence > 0.5
        assert len(attr.features) == 4
        assert attr.features[0].name == "W_amount"

    def test_amount_penalty(self):
        a = _make_record("s1", 10000)
        b = _make_record("o1", 5000, source="order")

        attr = _compute_feature_attribution(a, b)
        amount_feat = next(f for f in attr.features if f.name == "W_amount")
        assert amount_feat.raw_score < 0.8

    def test_method_bonus(self):
        a = _make_record("s1", 10000, method="card")
        b = _make_record("o1", 10000, method="card", source="order")

        attr = _compute_feature_attribution(a, b)
        method_feat = next(f for f in attr.features if f.name == "W_method")
        assert method_feat.raw_score == 1.0
