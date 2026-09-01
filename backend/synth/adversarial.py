"""
SettleAI — Adversarial dataset generator.

Generates edge cases designed to break naive reconciliation systems:
hash collisions, cyclic disputes, fractional penny skimming, truncated
references, partial refund chains, future-dated settlements, zero-amount
adjustments, and high-volume duplicates.
"""

from __future__ import annotations

import json
import random
import string
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


def _rand_id(prefix: str) -> str:
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=10))}"


class AdversarialGenerator:
    """Generates adversarial edge cases for stress-testing the reconciliation engine."""

    def __init__(self, seed: int = 99):
        random.seed(seed)
        self.records: list[dict] = []
        self.ground_truth: list[dict] = []

    def generate(self, data_dir: str = "data") -> dict:
        """Generate all adversarial edge cases."""
        self.records = []
        self.ground_truth = []

        self._hash_collisions()
        self._cyclic_disputes()
        self._fractional_penny_skimming()
        self._truncated_references()
        self._partial_refund_chains()
        self._future_dated_settlement()
        self._zero_amount_adjustments()
        self._high_volume_duplicates()

        out = Path(data_dir)
        out.mkdir(parents=True, exist_ok=True)
        out.joinpath("adversarial.json").write_text(
            json.dumps(self.records, indent=2)
        )
        out.joinpath("ground_truth.json").write_text(
            json.dumps(self.ground_truth, indent=2)
        )

        return {
            "adversarial_count": len(self.records),
            "ground_truth_count": len(self.ground_truth),
            "categories": list(set(r.get("adversarial_tag", "") for r in self.records)),
        }

    def _hash_collisions(self):
        """Same payment_id in two different settlement batches (system retry)."""
        payment_id = _rand_id("pay_RETRY")
        amount = 100000  # ₹1,000

        self.records.append({
            "entity_id": payment_id,
            "type": "payment",
            "debit": 0,
            "credit": 976400,  # ₹9,764 after MDR+GST
            "amount": amount,
            "currency": "INR",
            "fee": 20000,
            "tax": 3600,
            "settled": True,
            "created_at": int(datetime(2026, 8, 3).timestamp()),
            "settled_at": int(datetime(2026, 8, 5).timestamp()),
            "settlement_id": "setl_collide_001",
            "settlement_utr": "100000000000000001",
            "order_id": "order_collide_001",
            "payment_id": None,
            "method": "card",
            "is_adversarial": True,
            "adversarial_tag": "hash_collision",
        })

        self.records.append({
            "entity_id": f"pay_RETRY_DUP_{''.join(random.choices(string.ascii_lowercase, k=8))}",
            "type": "payment",
            "debit": 0,
            "credit": 976400,
            "amount": amount,
            "currency": "INR",
            "fee": 20000,
            "tax": 3600,
            "settled": True,
            "created_at": int(datetime(2026, 8, 3).timestamp()),
            "settled_at": int(datetime(2026, 8, 5).timestamp()),
            "settlement_id": "setl_collide_002",
            "settlement_utr": "100000000000000002",
            "order_id": "order_collide_001",  # Same order_id — collision
            "payment_id": None,
            "method": "card",
            "is_adversarial": True,
            "adversarial_tag": "hash_collision",
        })

        self.ground_truth.append({
            "tag": "hash_collision",
            "entity_ids": [payment_id, "pay_RETRY_DUP_*"],
            "expected_outcome": "DUPLICATE",
            "correct_match": "First occurrence only (setl_collide_001)",
            "correct_exception_code": "DUPLICATE",
        })

    def _cyclic_disputes(self):
        """Payment settled → chargeback → re-presented within 48h."""
        base = datetime(2026, 8, 10)

        self.records.append({
            "entity_id": "pay_CYCLIC_01",
            "type": "payment",
            "debit": 0,
            "credit": 490000,  # ₹4,900
            "amount": 500000,  # ₹5,000
            "currency": "INR",
            "fee": 10000,
            "tax": 1800,
            "settled": True,
            "created_at": int(base.timestamp()),
            "settled_at": int((base + timedelta(days=2)).timestamp()),
            "settlement_id": "setl_cyclic_A",
            "settlement_utr": "200000000000000001",
            "order_id": "order_cyclic_01",
            "payment_id": None,
            "method": "card",
            "is_adversarial": True,
            "adversarial_tag": "cyclic_dispute",
        })

        self.records.append({
            "entity_id": "rfnd_CYCLIC_01",
            "type": "refund",
            "debit": 500000,
            "credit": 0,
            "amount": 500000,
            "currency": "INR",
            "fee": 0,
            "tax": 0,
            "settled": True,
            "created_at": int((base + timedelta(hours=20)).timestamp()),
            "settled_at": int((base + timedelta(days=3)).timestamp()),
            "settlement_id": "setl_cyclic_B",
            "settlement_utr": "200000000000000002",
            "order_id": "order_cyclic_01",
            "payment_id": "pay_CYCLIC_01",
            "method": None,
            "is_adversarial": True,
            "adversarial_tag": "cyclic_dispute",
        })

        self.records.append({
            "entity_id": "pay_CYCLIC_01_RE",
            "type": "payment",
            "debit": 0,
            "credit": 490000,
            "amount": 500000,
            "currency": "INR",
            "fee": 10000,
            "tax": 1800,
            "settled": True,
            "created_at": int((base + timedelta(hours=40)).timestamp()),
            "settled_at": int((base + timedelta(days=4)).timestamp()),
            "settlement_id": "setl_cyclic_C",
            "settlement_utr": "200000000000000003",
            "order_id": "order_cyclic_01",
            "payment_id": None,
            "method": "card",
            "is_adversarial": True,
            "adversarial_tag": "cyclic_dispute",
        })

        self.ground_truth.append({
            "tag": "cyclic_dispute",
            "entity_ids": ["pay_CYCLIC_01", "rfnd_CYCLIC_01", "pay_CYCLIC_01_RE"],
            "expected_outcome": "NET_MATCH",
            "correct_net_amount": 490000 - 500000 + 490000,
            "correct_exception_code": None,
            "note": "Net effect: ₹4,800 credit across 3 batches",
        })

    def _fractional_penny_skimming(self):
        """8 payments of ₹100 → bank sees ₹799.92 (₹0.08 lost to rounding)."""
        settlement_id = "setl_penny_001"

        for i in range(8):
            self.records.append({
                "entity_id": f"pay_FRAC_{i+1:03d}",
                "type": "payment",
                "debit": 0,
                "credit": 9710,  # ₹97.10 per transaction
                "amount": 10000,  # ₹100
                "currency": "INR",
                "fee": 290,      # ₹2.90 per transaction
                "tax": 0,
                "settled": True,
                "created_at": int(datetime(2026, 8, 15).timestamp()),
                "settled_at": int(datetime(2026, 8, 17).timestamp()),
                "settlement_id": settlement_id,
                "settlement_utr": "300000000000000001",
                "order_id": f"order_frac_{i+1:03d}",
                "payment_id": None,
                "method": "card",
                "is_adversarial": True,
                "adversarial_tag": "fractional_penny",
            })

        self.bank_statements_stub = {
            "settlement_id": settlement_id,
            "expected_credit": 77680,  # 8 × 9710
            "actual_credit": 77600,    # 8 × 9700 (bank rounded differently)
            "discrepancy_paise": 80,    # ₹0.80 total — proves accumulation
        }

        self.ground_truth.append({
            "tag": "fractional_penny",
            "entity_ids": [f"pay_FRAC_{i+1:03d}" for i in range(8)],
            "expected_outcome": "ROUNDING",
            "total_discrepancy_paise": 80,
            "correct_exception_code": "FRACTIONAL_PENNY",
            "note": "8 × ₹0.10 bank-side rounding = ₹0.80 cumulative loss",
        })

    def _truncated_references(self):
        """Bank truncates reference strings."""
        references = [
            ("INV-2024-001-PREMIUM", "INV-2024-001-P"),  # Truncated mid-word
            ("ORDER/RCPT/98765/PAID", "ORDER/RCPT/987"),  # Truncated mid-number
            ("Settlement Batch #42 Full", "Settlement Ba"),  # Heavily truncated
        ]

        for i, (full, truncated) in enumerate(references):
            self.records.append({
                "entity_id": f"pay_TRUNC_{i+1:03d}",
                "type": "payment",
                "debit": 0,
                "credit": 485000,
                "amount": 500000,
                "currency": "INR",
                "fee": 15000,
                "tax": 0,
                "settled": True,
                "created_at": int(datetime(2026, 8, 20).timestamp()),
                "settled_at": int(datetime(2026, 8, 22).timestamp()),
                "settlement_id": f"setl_trunc_{i+1:03d}",
                "settlement_utr": f"40000000000000000{i+1}",
                "order_id": f"order_trunc_{i+1:03d}",
                "payment_id": None,
                "method": "card",
                "description": truncated,  # Truncated version in settlement
                "is_adversarial": True,
                "adversarial_tag": "truncated_reference",
            })

            self.orders_stub = getattr(self, 'orders_stub', [])
            self.orders_stub.append({
                "order_id": f"order_trunc_{i+1:03d}",
                "reference": full,
            })

        self.ground_truth.append({
            "tag": "truncated_reference",
            "entity_ids": [f"pay_TRUNC_{i+1:03d}" for i in range(3)],
            "expected_outcome": "MATCH",
            "correct_exception_code": None,
            "note": "Fuzzy string matching should resolve with Levenshtein > 0.6",
        })

    def _partial_refund_chains(self):
        """Payment with partial refund (not full amount)."""
        self.records.append({
            "entity_id": "pay_PARTIAL_01",
            "type": "payment",
            "debit": 0,
            "credit": 971000,
            "amount": 1000000,
            "currency": "INR",
            "fee": 29000,
            "tax": 0,
            "settled": True,
            "created_at": int(datetime(2026, 8, 25).timestamp()),
            "settled_at": int(datetime(2026, 8, 27).timestamp()),
            "settlement_id": "setl_partial_001",
            "settlement_utr": "500000000000000001",
            "order_id": "order_partial_01",
            "payment_id": None,
            "method": "card",
            "is_adversarial": True,
            "adversarial_tag": "partial_refund",
        })

        self.records.append({
            "entity_id": "rfnd_PARTIAL_01",
            "type": "refund",
            "debit": 300000,
            "credit": 0,
            "amount": 300000,
            "currency": "INR",
            "fee": 0,
            "tax": 0,
            "settled": True,
            "created_at": int((datetime(2026, 8, 25) + timedelta(days=1)).timestamp()),
            "settled_at": int((datetime(2026, 8, 27) + timedelta(days=2)).timestamp()),
            "settlement_id": "setl_partial_002",
            "settlement_utr": "500000000000000002",
            "order_id": "order_partial_01",
            "payment_id": "pay_PARTIAL_01",
            "method": None,
            "is_adversarial": True,
            "adversarial_tag": "partial_refund",
        })

        self.ground_truth.append({
            "tag": "partial_refund",
            "entity_ids": ["pay_PARTIAL_01", "rfnd_PARTIAL_01"],
            "expected_outcome": "PARTIAL_MATCH",
            "correct_exception_code": "PARTIAL_PAYMENT",
            "note": "Refund ₹3,000 < payment ₹10,000 → partial match + flag remainder",
        })

    def _future_dated_settlement(self):
        """Settlement outside T+2 window."""
        self.records.append({
            "entity_id": "pay_FUTURE_01",
            "type": "payment",
            "debit": 0,
            "credit": 485000,
            "amount": 500000,
            "currency": "INR",
            "fee": 15000,
            "tax": 0,
            "settled": True,
            "created_at": int(datetime(2026, 8, 1).timestamp()),
            "settled_at": int(datetime(2026, 8, 12).timestamp()),  # 11 days later!
            "settlement_id": "setl_future_001",
            "settlement_utr": "600000000000000001",
            "order_id": "order_future_01",
            "payment_id": None,
            "method": "card",
            "is_adversarial": True,
            "adversarial_tag": "future_dated",
        })

        self.ground_truth.append({
            "tag": "future_dated",
            "entity_ids": ["pay_FUTURE_01"],
            "expected_outcome": "EXCEPTION",
            "correct_exception_code": "TIMING_DRIFT",
            "note": "Settled 9 days after payment — outside T+2 tolerance",
        })

    def _zero_amount_adjustments(self):
        """Adjustments with ₹0 amount."""
        for i in range(2):
            self.records.append({
                "entity_id": _rand_id("adj_ZERO"),
                "type": "adjustment",
                "debit": 0,
                "credit": 0,
                "amount": 0,
                "currency": "INR",
                "fee": 0,
                "tax": 0,
                "settled": True,
                "created_at": int(datetime(2026, 8, 28).timestamp()),
                "settled_at": int(datetime(2026, 8, 28).timestamp()),
                "settlement_id": f"setl_zero_{i+1:03d}",
                "settlement_utr": None,
                "order_id": None,
                "payment_id": None,
                "method": None,
                "description": "Zero adjustment",
                "is_adversarial": True,
                "adversarial_tag": "zero_amount",
            })

        self.ground_truth.append({
            "tag": "zero_amount",
            "entity_ids": ["adj_ZERO_*"],
            "expected_outcome": "SKIP",
            "correct_exception_code": None,
            "note": "Zero-amount adjustments — no financial impact, skip from matching",
        })

    def _high_volume_duplicates(self):
        """50 records with 3 exact duplicates."""
        base_id = _rand_id("pay_HVOL")

        for i in range(50):
            self.records.append({
                "entity_id": f"{base_id}_{i:03d}" if i < 47 else f"{base_id}_DUP_{i-46}",
                "type": "payment",
                "debit": 0,
                "credit": 971000,
                "amount": 1000000,
                "currency": "INR",
                "fee": 29000,
                "tax": 0,
                "settled": True,
                "created_at": int(datetime(2026, 8, 29).timestamp()),
                "settled_at": int(datetime(2026, 8, 31).timestamp()),
                "settlement_id": f"setl_hvol_{i // 10 + 1:03d}",
                "settlement_utr": f"700000000000000{i:03d}",
                "order_id": f"order_hvol_{i // 10 + 1:03d}",
                "payment_id": None,
                "method": "card",
                "is_adversarial": True,
                "adversarial_tag": "high_volume_duplicates",
            })

        self.ground_truth.append({
            "tag": "high_volume_duplicates",
            "entity_ids": [f"{base_id}_DUP_*"],
            "expected_outcome": "DEDUP",
            "correct_exception_code": "DUPLICATE",
            "note": "3 exact duplicates should be detected and removed before matching",
        })
