"""
SettleAI — Exception injection scenarios.

Injects realistic financial exceptions into the synthetic dataset
with known ground truth for validation.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal


EXCEPTION_SCENARIOS = [
    {
        "name": "Fee Deduction Variance #1",
        "code": "FEE_DEDUCTION",
        "description": "MDR rate applied differs from contracted rate",
        "injection": "Modify fee from 2% to 2.5% on one payment",
        "expected_impact": "₹50 extra deduction on ₹10,000 transaction",
    },
    {
        "name": "Fee Deduction Variance #2",
        "code": "FEE_DEDUCTION",
        "description": "Different MDR rate for same card type",
        "injection": "Apply 1.5% MDR instead of 2% on a card payment",
        "expected_impact": "₹50 less deduction — merchant overpaid",
    },
    {
        "name": "Fee Deduction Variance #3",
        "code": "FEE_DEDUCTION",
        "description": "Fee on a refund (should be zero)",
        "injection": "Add non-zero fee to a refund record",
        "expected_impact": "Refund should have ₹0 fee — anomaly",
    },
    {
        "name": "GST Calculation Error",
        "code": "TAX_DEDUCTION",
        "description": "GST on MDR is wrong by ₹0.50",
        "injection": "Round GST to nearest rupee instead of paise",
        "expected_impact": "₹0.50 discrepancy in tax line",
    },
    {
        "name": "Sub-rupee Rounding #1",
        "code": "ROUNDING",
        "description": "₹0.01 difference from bank-side rounding",
        "injection": "Bank rounds 9710.5 → 9711 instead of 9710",
        "expected_impact": "₹0.01 variance — within tolerance",
    },
    {
        "name": "Sub-rupee Rounding #2",
        "code": "ROUNDING",
        "description": "Cumulative rounding across 5 transactions",
        "injection": "Each of 5 transactions off by ₹0.01 in opposite direction",
        "expected_impact": "₹0.01 to ₹0.05 cumulative — classify as ROUNDING",
    },
    {
        "name": "Partial Payment #1",
        "code": "PARTIAL_PAYMENT",
        "description": "Customer paid 60% of invoice amount",
        "injection": "Payment of ₹6,000 against order of ₹10,000",
        "expected_impact": "Partial match + flag ₹4,000 remainder",
    },
    {
        "name": "Partial Payment #2",
        "code": "PARTIAL_PAYMENT",
        "description": "Two payments totaling 85% of invoice",
        "injection": "₹5,000 + ₹3,500 against ₹10,000 order",
        "expected_impact": "Multi-match + flag ₹1,500 remainder",
    },
    {
        "name": "Partial Payment #3",
        "code": "PARTIAL_PAYMENT",
        "description": "Overpayment by ₹200",
        "injection": "Payment of ₹10,200 against order of ₹10,000",
        "expected_impact": "Match with ₹200 overage flagged",
    },
    {
        "name": "Orphan Settlement #1",
        "code": "UNEXPLAINED",
        "description": "Settlement line with no matching order in OMS",
        "injection": "Payment entity with non-existent order_id",
        "expected_impact": "Cannot match — UNEXPLAINED exception",
    },
    {
        "name": "Orphan Settlement #2",
        "code": "UNEXPLAINED",
        "description": "Bank credit with no settlement report entry",
        "injection": "Extra bank credit not linked to any settlement_id",
        "expected_impact": "Ghost credit — requires investigation",
    },
    {
        "name": "Refund Timing Mismatch #1",
        "code": "TIMING_DRIFT",
        "description": "Refund settled in next batch, not current",
        "injection": "Refund created Aug 15 but settled Aug 19 (next batch)",
        "expected_impact": "Cross-batch matching needed",
    },
    {
        "name": "Refund Timing Mismatch #2",
        "code": "TIMING_DRIFT",
        "description": "Refund with settlement_id mismatch",
        "injection": "Refund settlement_id doesn't match any batch",
        "expected_impact": "UNEXPLAINED or TIMING_DRIFT",
    },
    {
        "name": "Duplicate Detection",
        "code": "DUPLICATE",
        "description": "Same payment appears twice (system bug)",
        "injection": "Identical payment record with different entity_id",
        "expected_impact": "One should be flagged as DUPLICATE",
    },
    {
        "name": "Currency/Timing Drift #1",
        "code": "TIMING_DRIFT",
        "description": "Timestamp slightly outside T+2 window",
        "injection": "Settlement at T+5 instead of T+2",
        "expected_impact": "Within extended tolerance or flagged",
    },
    {
        "name": "Currency/Timing Drift #2",
        "code": "TIMING_DRIFT",
        "description": "Payment created on weekend — settlement delayed",
        "injection": "Friday evening payment, settled Tuesday (T+3)",
        "expected_impact": "Weekend skip — should be accepted",
    },
    {
        "name": "Description Mismatch #1",
        "code": None,
        "description": "Reference truncated by bank",
        "injection": "Shorten order_id by removing last 4 chars",
        "expected_impact": "Fuzzy string match should still work",
    },
    {
        "name": "Description Mismatch #2",
        "code": None,
        "description": "Description field has extra prefix",
        "injection": "Prepend 'Web: ' to the reference string",
        "expected_impact": "Fuzzy match should handle",
    },
    {
        "name": "Description Mismatch #3",
        "code": None,
        "description": "Case difference in reference",
        "injection": "Change case of entire reference string",
        "expected_impact": "Should be case-insensitive match",
    },
]


def get_exception_summary() -> dict:
    """Get a summary of all exception scenarios."""
    from collections import Counter
    code_counts = Counter(s["code"] for s in EXCEPTION_SCENARIOS if s["code"])
    return {
        "total_scenarios": len(EXCEPTION_SCENARIOS),
        "by_code": dict(code_counts),
        "scenarios": [
            {"name": s["name"], "code": s["code"], "description": s["description"]}
            for s in EXCEPTION_SCENARIOS
        ],
    }
