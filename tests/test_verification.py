"""
Tests for Phase 5: Verification Gate.
"""

import pytest
from decimal import Decimal
from backend.agents.verification import _verify_one_match
from backend.models import (
    FeatureAttribution, FeatureWeight, MatchStatus, NormalizedRecord,
    ProposedMatch, RecordSource, TransactionType, ToleranceConfig,
)




def _make_record(id, amount, source="settlement"):
    return NormalizedRecord(
        id=id, source=source, amount=str(amount),
        type="payment",
    )


def _make_match(id, a_id, b_id, confidence=0.9):
    return ProposedMatch(
        match_id=id, record_a_id=a_id, record_b_id=b_id,
        match_status=MatchStatus.EXACT, confidence=confidence,
        phase="exact_match",
    )


class TestVerificationGate:
    def test_confidence_below_threshold(self):
        match = _make_match("m1", "s1", "o1", confidence=0.70)
        records = {"s1": _make_record("s1", 10000), "o1": _make_record("o1", 10000, "order")}
        threshold = Decimal("0.85")
        tolerance = Decimal("1.00")

        result = _verify_one_match(match, records, threshold, tolerance, set())
        assert not result["accepted"]
        assert result["rejection"].reason == "CONFIDENCE_BELOW_THRESHOLD"

    def test_amount_mismatch(self):
        match = _make_match("m1", "s1", "o1", confidence=0.95)
        records = {"s1": _make_record("s1", 10000), "o1": _make_record("o1", 50000, "order")}
        threshold = Decimal("0.85")
        tolerance = Decimal("1.00")

        result = _verify_one_match(match, records, threshold, tolerance, set())
        assert not result["accepted"]
        assert result["rejection"].reason == "AMOUNT_MISMATCH"

    def test_successful_verification(self):
        match = _make_match("m1", "s1", "o1", confidence=0.95)
        records = {"s1": _make_record("s1", 10000), "o1": _make_record("o1", 10000, "order")}
        threshold = Decimal("0.85")
        tolerance = Decimal("1.00")

        result = _verify_one_match(match, records, threshold, tolerance, set())
        assert result["accepted"]
        assert result["verified_match"].verification_proof is not None

    def test_duplicate_match_rejected(self):
        match = _make_match("m1", "s1", "o1", confidence=0.95)
        records = {"s1": _make_record("s1", 10000), "o1": _make_record("o1", 10000, "order")}
        threshold = Decimal("0.85")
        tolerance = Decimal("1.00")

        result = _verify_one_match(match, records, threshold, tolerance, {"s1"})
        assert not result["accepted"]
        assert result["rejection"].reason == "DUPLICATE_MATCH"

    def test_decimal_precision(self):
        """Verify that Decimal arithmetic works, not float."""
        match = _make_match("m1", "s1", "o1", confidence=0.95)
        records = {"s1": _make_record("s1", "100.01"), "o1": _make_record("o1", "100.02", "order")}
        threshold = Decimal("0.85")
        tolerance = Decimal("0.01")

        result = _verify_one_match(match, records, threshold, tolerance, set())
        assert result["accepted"]
