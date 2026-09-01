"""
SettleAI — Synthetic data generator.

Generates realistic financial data matching Razorpay's settlement recon API schema
across 4 sources: settlement recon, order ledger, bank statements, and GST records.
"""

from __future__ import annotations

import hashlib
import json
import random
import string
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Optional


def _rand_id(prefix: str, length: int = 14) -> str:
    chars = string.ascii_lowercase + string.digits
    return f"{prefix}_{''.join(random.choices(chars, k=length))}"


def _rand_utr() -> str:
    return f"{random.randint(10**17, 10**18 - 1)}"


def _rand_date(start: datetime, end: datetime) -> datetime:
    delta = end - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_seconds)


def _paise(amount: float) -> int:
    """Convert rupees to paise (integer)."""
    return int(Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100)



MDR_RATES = {
    "card": Decimal("0.02"),       # 2% for cards
    "netbanking": Decimal("0.015"), # 1.5%
    "wallet": Decimal("0.02"),
    "upi": Decimal("0.00"),        # Zero MDR for UPI
    "emi": Decimal("0.025"),       # 2.5%
}

GST_RATE = Decimal("0.18")  # 18% GST on MDR



class SyntheticDataGenerator:
    """Generates realistic synthetic financial data."""

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.settlements: list[dict] = []
        self.orders: list[dict] = []
        self.bank_statements: list[dict] = []
        self.gst_records: list[dict] = []
        self._order_ids: list[str] = []
        self._payment_ids: list[str] = []
        self._settlement_ids: list[str] = []
        self._bank_utrs: list[str] = []

    def generate(
        self,
        total_records: int = 200,
        num_batches: int = 4,
        data_dir: str = "data",
    ) -> dict:
        """Generate all 4 data sources and write to JSON files."""

        base_date = datetime(2026, 8, 1)
        batch_size = total_records // num_batches

        for batch_idx in range(num_batches):
            settlement_id = _rand_id("setl")
            self._settlement_ids.append(settlement_id)
            batch_start = base_date + timedelta(days=batch_idx * 2)
            batch_end = batch_start + timedelta(days=2)

            self._generate_settlement_batch(
                settlement_id, batch_start, batch_end, batch_size, batch_idx
            )
            self._generate_bank_credit(settlement_id, batch_start + timedelta(days=2))
            self._generate_gst_record(settlement_id, batch_start + timedelta(days=2))

        out = Path(data_dir)
        out.mkdir(parents=True, exist_ok=True)

        self._write_json(out / "settlements.json", self.settlements)
        self._write_json(out / "orders.json", self.orders)
        self._write_json(out / "bank_statements.json", self.bank_statements)
        self._write_json(out / "gst_records.json", self.gst_records)

        return {
            "settlement_count": len(self.settlements),
            "order_count": len(self.orders),
            "bank_count": len(self.bank_statements),
            "gst_count": len(self.gst_records),
        }

    def _generate_settlement_batch(
        self,
        settlement_id: str,
        start: datetime,
        end: datetime,
        batch_size: int,
        batch_idx: int,
    ):
        """Generate one settlement batch with payments, refunds, transfers, adjustments."""
        utr = _rand_utr()

        num_payments = int(batch_size * 0.60)
        num_refunds = int(batch_size * 0.15)
        num_transfers = int(batch_size * 0.15)
        num_adjustments = batch_size - num_payments - num_refunds - num_transfers

        batch_net = Decimal("0")

        for _ in range(num_payments):
            amount = Decimal(str(random.choice([
                500, 1000, 1500, 2000, 2500, 3000, 5000,
                7500, 10000, 15000, 20000, 25000, 50000,
                75000, 100000,
            ]) + random.randint(-50, 500)))
            method = random.choice(["card", "upi", "netbanking", "wallet", "emi"])
            mdr_rate = MDR_RATES[method]
            fee = (amount * mdr_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            tax = (fee * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            credit = amount - fee - tax

            order_id = _rand_id("order")
            payment_id = _rand_id("pay")
            self._order_ids.append(order_id)
            self._payment_ids.append(payment_id)

            created_at = _rand_date(start, end)

            self.settlements.append({
                "entity_id": payment_id,
                "type": "payment",
                "debit": 0,
                "credit": _paise(float(credit)),
                "amount": _paise(float(amount)),
                "currency": "INR",
                "fee": _paise(float(fee)),
                "tax": _paise(float(tax)),
                "on_hold": False,
                "settled": True,
                "created_at": int(created_at.timestamp()),
                "settled_at": int((created_at + timedelta(days=2)).timestamp()),
                "settlement_id": settlement_id,
                "posted_at": None,
                "credit_type": "default",
                "description": random.choice([
                    "Payment via Checkout", "Recurring Payment via Subscription",
                    "Payment via Links", "Payment via Payment Page",
                ]),
                "notes": None,
                "payment_id": None,
                "settlement_utr": utr,
                "order_id": order_id,
                "order_receipt": None,
                "method": method,
                "card_network": random.choice(["Visa", "MasterCard", "RuPay", "AMEX"]) if method == "card" else None,
                "card_issuer": random.choice(["HDFC", "ICICI", "SBI", "KARB"]) if method == "card" else None,
                "card_type": random.choice(["credit", "debit"]) if method == "card" else None,
                "dispute_id": None,
            })

            self.orders.append({
                "order_id": order_id,
                "customer_id": _rand_id("cust"),
                "amount": _paise(float(amount)),
                "currency": "INR",
                "status": "captured",
                "created_at": int(created_at.timestamp()),
                "payment_id": payment_id,
                "expected_settlement_date": int((created_at + timedelta(days=2)).timestamp()),
                "method": method,
                "description": f"Order for customer {random.randint(1000, 9999)}",
            })

            batch_net += credit

        for _ in range(num_refunds):
            refund_amount = Decimal(str(random.choice([500, 1000, 1500, 2000, 2500, 5000])))
            refund_id = _rand_id("rfnd")
            created_at = _rand_date(start, end)

            self.settlements.append({
                "entity_id": refund_id,
                "type": "refund",
                "debit": _paise(float(refund_amount)),
                "credit": 0,
                "amount": _paise(float(refund_amount)),
                "currency": "INR",
                "fee": 0,
                "tax": 0,
                "on_hold": False,
                "settled": True,
                "created_at": int(created_at.timestamp()),
                "settled_at": int((created_at + timedelta(days=2)).timestamp()),
                "settlement_id": settlement_id,
                "posted_at": None,
                "credit_type": "default",
                "description": "Refund",
                "notes": None,
                "payment_id": random.choice(self._payment_ids) if self._payment_ids else None,
                "settlement_utr": utr,
                "order_id": random.choice(self._order_ids) if self._order_ids else None,
                "order_receipt": None,
                "method": None,
                "card_network": None,
                "card_issuer": None,
                "card_type": None,
                "dispute_id": None,
            })

            batch_net -= refund_amount

        for _ in range(num_transfers):
            transfer_amount = Decimal(str(random.choice([5000, 10000, 15000, 20000])))
            transfer_id = _rand_id("trf")
            fee = Decimal(str(random.randint(100, 500)))
            tax = (fee * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            debit = transfer_amount + fee + tax

            created_at = _rand_date(start, end)

            self.settlements.append({
                "entity_id": transfer_id,
                "type": "transfer",
                "debit": _paise(float(debit)),
                "credit": 0,
                "amount": _paise(float(transfer_amount)),
                "currency": "INR",
                "fee": _paise(float(fee)),
                "tax": _paise(float(tax)),
                "on_hold": False,
                "settled": True,
                "created_at": int(created_at.timestamp()),
                "settled_at": int((created_at + timedelta(days=2)).timestamp()),
                "settlement_id": settlement_id,
                "posted_at": None,
                "credit_type": "default",
                "description": None,
                "notes": None,
                "payment_id": random.choice(self._payment_ids) if self._payment_ids else None,
                "settlement_utr": utr,
                "order_id": None,
                "order_receipt": None,
                "method": None,
                "card_network": None,
                "card_issuer": None,
                "card_type": None,
                "dispute_id": None,
            })

            batch_net -= debit

        for _ in range(max(num_adjustments, 0)):
            adj_amount = Decimal(str(random.choice([100, 250, 500, 1000])))
            adj_id = _rand_id("adj")
            created_at = _rand_date(start, end)
            is_credit = random.random() > 0.3

            self.settlements.append({
                "entity_id": adj_id,
                "type": "adjustment",
                "debit": 0 if is_credit else _paise(float(adj_amount)),
                "credit": _paise(float(adj_amount)) if is_credit else 0,
                "amount": _paise(float(adj_amount)),
                "currency": "INR",
                "fee": 0,
                "tax": 0,
                "on_hold": False,
                "settled": True,
                "created_at": int(created_at.timestamp()),
                "settled_at": int((created_at + timedelta(days=2)).timestamp()),
                "settlement_id": settlement_id,
                "posted_at": None,
                "credit_type": "default",
                "description": random.choice(["Rounding adjustment", "Fee correction", "test reason"]),
                "notes": None,
                "payment_id": None,
                "settlement_utr": None,
                "order_id": None,
                "order_receipt": None,
                "method": None,
                "card_network": None,
                "card_issuer": None,
                "card_type": None,
                "dispute_id": None,
            })

            if is_credit:
                batch_net += adj_amount
            else:
                batch_net -= adj_amount

    def _generate_bank_credit(self, settlement_id: str, date: datetime):
        """Generate a bank statement credit matching a settlement batch."""
        utr = _rand_utr()
        self._bank_utrs.append(utr)

        batch_total = Decimal("0")
        for s in self.settlements:
            if s["settlement_id"] == settlement_id:
                batch_total += Decimal(str(s["credit"])) - Decimal(str(s["debit"]))

        self.bank_statements.append({
            "utr": utr,
            "credit_amount": int(batch_total),
            "credit_date": int(date.timestamp()),
            "narration": f"NEFT CR: RAZORPAY SETTLEMENT {utr}",
            "bank_name": "HDFC Bank",
            "settlement_id": settlement_id,
        })

    def _generate_gst_record(self, settlement_id: str, date: datetime):
        """Generate GST tax record for a settlement batch."""
        total_fee = Decimal("0")
        total_tax = Decimal("0")
        total_settled = Decimal("0")

        for s in self.settlements:
            if s["settlement_id"] == settlement_id:
                total_fee += Decimal(str(s["fee"]))
                total_tax += Decimal(str(s["tax"]))
                total_settled += Decimal(str(s["credit"]))

        record = {
            "settlement_id": settlement_id,
            "total_mdr": int(total_fee),
            "gst_on_mdr": int(total_tax),
            "total_settled": int(total_settled),
            "invoice_date": int(date.timestamp()),
        }

        if random.random() > 0.5:
            half_tax = int(total_tax) // 2
            record["cgst_on_mdr"] = half_tax
            record["sgst_on_mdr"] = int(total_tax) - half_tax
            del record["gst_on_mdr"]

        self.gst_records.append(record)

    @staticmethod
    def _write_json(path: Path, data: list[dict]):
        path.write_text(json.dumps(data, indent=2, default=str))
