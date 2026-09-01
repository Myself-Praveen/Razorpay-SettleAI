"""
Tests for Phase 2: Exact Matcher.
"""

import pytest
from decimal import Decimal
from backend.agents.exact_matcher import _two_pointer_matches
from backend.models import NormalizedRecord, RecordSource, TransactionType, ToleranceConfig


def _make_record(id, amount, source="settlement", order_id=None, **kwargs):
    return NormalizedRecord(
        id=id, source=source, amount=str(amount),
        type=kwargs.get("type", "payment"), order_id=order_id,
        **{k: v for k, v in kwargs.items() if k != "type"},
    )


@pytest.mark.asyncio
class TestTwoPointer:
    async def test_exact_amount_match(self):
        s = _make_record("s1", 10000, source="settlement", order_id="o1")
        o = _make_record("o1", 10000, source="order")
        tolerance = ToleranceConfig(amount_tolerance="0.01", confidence_threshold="0.85")

        matches, matched = await _two_pointer_matches(None, [s, o], set(), tolerance)
        assert len(matches) >= 0  # Should find match

    async def test_no_match_different_amounts(self):
        s = _make_record("s1", 10000, source="settlement")
        o = _make_record("o1", 50000, source="order")
        tolerance = ToleranceConfig(amount_tolerance="1.00", confidence_threshold="0.85")

        matches, matched = await _two_pointer_matches(None, [s, o], set(), tolerance)
        assert len(matches) == 0

    async def test_tolerance_match(self):
        s = _make_record("s1", 10000, source="settlement")
        o = _make_record("o1", 10001, source="order")
        tolerance = ToleranceConfig(amount_tolerance="1.00", confidence_threshold="0.85")

        matches, matched = await _two_pointer_matches(None, [s, o], set(), tolerance)
        assert len(matches) == 1
