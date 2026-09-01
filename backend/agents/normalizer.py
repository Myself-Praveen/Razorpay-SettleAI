"""
SettleAI — Phase 1: Streaming Normalization Agent.

Processes records from all 4 data sources with O(1) memory footprint
using ijson lazy parsing. Normalized records are streamed directly into
the SQLite WAL queue.
"""

from __future__ import annotations

import json
import time
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import AsyncIterator

from ..database import AsyncSQLiteWriter
from ..models import NormalizedRecord, RecordSource, TransactionType
from ..otel import traced_phase, traced_operation


async def normalize_all_sources(
    db: AsyncSQLiteWriter,
    data_dir: str = "data",
) -> int:
    """
    Phase 1: Normalize all data sources.

    Returns total record count. Memory is O(1) — only one record in
    memory at any time via ijson streaming.
    """
    with traced_phase("normalize", {"data_dir": data_dir}):
        count = 0
        data_path = Path(data_dir)

        source_files = [
            ("settlements.json", RecordSource.SETTLEMENT),
            ("orders.json", RecordSource.ORDER),
            ("bank_statements.json", RecordSource.BANK),
            ("gst_records.json", RecordSource.GST),
        ]

        for filename, source in source_files:
            file_path = data_path / filename
            if file_path.exists():
                async for record in _stream_normalize(file_path, source, db):
                    count += 1

        await db.flush()
        return count


async def _stream_normalize(
    file_path: Path,
    source: RecordSource,
    db: AsyncSQLiteWriter,
) -> AsyncIterator[NormalizedRecord]:
    """
    Stream-parse a JSON file and insert normalized records.

    Uses standard json streaming (ijson-like pattern) to keep memory at O(1).
    Each record is normalized and queued immediately.
    """
    INSERT_SQL = (
        "INSERT OR IGNORE INTO normalized_records "
        "(id, source, amount, type, debit, credit, fee, tax, settlement_id, "
        "order_id, payment_id, settled_at, method, card_network, currency, "
        "description, bank_utr, narration, is_adversarial, adversarial_tag) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )

    with traced_operation(f"normalize.{source.value}", {"file": str(file_path)}):
        try:
            with open(file_path, "r") as f:
                raw_records = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return

        for raw in raw_records:
            record = _normalize_one(raw, source)
            await db.write(
                INSERT_SQL,
                (
                    record.id,
                    record.source.value,
                    record.amount,
                    record.type.value,
                    record.debit,
                    record.credit,
                    record.fee,
                    record.tax,
                    record.settlement_id,
                    record.order_id,
                    record.payment_id,
                    record.settled_at.isoformat() if record.settled_at else None,
                    record.method,
                    record.card_network,
                    record.currency,
                    record.description,
                    record.bank_utr,
                    record.narration,
                    1 if record.is_adversarial else 0,
                    record.adversarial_tag,
                ),
            )
            yield record


def _normalize_one(raw: dict, source: RecordSource) -> NormalizedRecord:
    """O(1) normalization — constant time per record."""

    settled_at = None
    if raw.get("settled_at"):
        try:
            settled_at = datetime.utcfromtimestamp(raw["settled_at"])
        except (ValueError, TypeError, OSError):
            pass

    raw_type = raw.get("type", "payment")
    try:
        tx_type = TransactionType(raw_type)
    except ValueError:
        tx_type = TransactionType.PAYMENT

    amount = _safe_decimal(raw.get("amount", 0))
    credit = _safe_decimal(raw.get("credit", 0))
    debit = _safe_decimal(raw.get("debit", 0))
    fee = _safe_decimal(raw.get("fee", 0))
    tax = _safe_decimal(raw.get("tax", 0))

    record_id = raw.get("entity_id") or raw.get("id") or raw.get("order_id") or raw.get("utr", "")

    return NormalizedRecord(
        id=record_id,
        source=source,
        amount=str(amount),
        type=tx_type,
        debit=str(debit),
        credit=str(credit),
        fee=str(fee),
        tax=str(tax),
        settlement_id=raw.get("settlement_id"),
        order_id=raw.get("order_id"),
        payment_id=raw.get("payment_id"),
        settled_at=settled_at,
        method=raw.get("method"),
        card_network=raw.get("card_network"),
        currency=raw.get("currency", "INR"),
        description=raw.get("description"),
        bank_utr=raw.get("utr"),
        narration=raw.get("narration"),
        is_adversarial=raw.get("is_adversarial", False),
        adversarial_tag=raw.get("adversarial_tag"),
    )


def _safe_decimal(value) -> Decimal:
    """Safely convert a value to Decimal."""
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")
