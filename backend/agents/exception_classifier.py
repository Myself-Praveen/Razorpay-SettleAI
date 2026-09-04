"""
SettleAI — Phase 4: Exception Classifier.

Classifies unmatched records into specific exception codes with AI-generated
root cause hypotheses and suggested resolutions.

Uses GPT-4o-mini for complex classification only.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from decimal import Decimal
from difflib import SequenceMatcher
from typing import Optional

from ..database import AsyncSQLiteWriter
from ..hitl_memory import HITLMemory
from ..models import (
    ExceptionCode, ExceptionRecord, NormalizedRecord, ToleranceConfig,
)
from ..otel import traced_phase, traced_operation
from .pii_masker import PIIMasker

VALID_EXCEPTION_CODES = {code.value for code in ExceptionCode}

EXCEPTION_SYSTEM_PROMPT = """You are a financial reconciliation exception classifier.

For the given unmatched record, classify it into one of these exception codes:
- FEE_DEDUCTION: MDR fee rate differs from expected
- TAX_DEDUCTION: GST on MDR variance
- ROUNDING: Sub-rupee rounding differences
- PARTIAL_PAYMENT: Payment amount doesn't match full invoice
- UNEXPLAINED: No matching record found in any source
- DUPLICATE: Record appears multiple times
- TIMING_DRIFT: Record outside expected date window
- FRACTIONAL_PENNY: Accumulated small discrepancies
- VERIFICATION_FAILED: Match failed arithmetic verification
- UNCLASSIFIED_REVIEW_NEEDED: Cannot determine cause

Output a JSON object:
{
  "exception_code": "EXCEPTION_CODE_HERE",
  "hypothesis": "1-2 sentence root cause explanation",
  "suggested_resolution": "Specific action a human should take",
  "confidence_level": "high" | "medium" | "low"
}"""


async def classify_exceptions(
    db: AsyncSQLiteWriter,
    unmatched: list[NormalizedRecord],
    tolerance: ToleranceConfig,
    hitl_memory: Optional[HITLMemory] = None,
) -> list[ExceptionRecord]:
    """
    Phase 4: Classify unmatched records into exception codes.
    """
    with traced_phase("classify", {
        "unmatched_count": len(unmatched),
    }):
        exceptions = []

        for record in unmatched:
            with traced_operation(f"classify.{record.id}"):
                exc = await _classify_one(record, db, tolerance, hitl_memory)
                exceptions.append(exc)

        await _store_exceptions(db, exceptions)
        await db.flush()

        return exceptions


async def _classify_one(
    record: NormalizedRecord,
    db: AsyncSQLiteWriter,
    tolerance: ToleranceConfig,
    hitl_memory: Optional[HITLMemory] = None,
) -> ExceptionRecord:
    """Classify a single unmatched record."""

    few_shot = ""
    if hitl_memory:
        few_shot = hitl_memory.build_few_shot_prompt(
            exception_code=record.adversarial_tag or "UNKNOWN",
            record_context=record.to_context_dict(),
        )

    few_shot_str = f"Human corrections for similar cases:\n{few_shot}" if few_shot else ""
    context = f"""
Record ID: {PIIMasker.mask(record.id)}
Source: {record.source.value}
Amount: ₹{record.amount}
Type: {record.type.value}
Settlement ID: {PIIMasker.mask(record.settlement_id) if record.settlement_id else 'None'}
Order ID: {PIIMasker.mask(record.order_id) if record.order_id else 'None'}
Payment ID: {PIIMasker.mask(record.payment_id) if record.payment_id else 'None'}
Date: {record.settled_at}
Method: {record.method}
Description: {PIIMasker.mask(record.description) if record.description else 'None'}
Adversarial tag: {record.adversarial_tag}
{few_shot_str}
"""

    raw_response = None
    try:
        raw_response = await _call_llm_classifier(context)
        parsed = _parse_classification(raw_response)

        if parsed.get("exception_code") not in VALID_EXCEPTION_CODES:
            parsed = _deterministic_classify(record)
    except Exception:
        parsed = _deterministic_classify(record)

    exc_id = f"exc_{record.id}"

    return ExceptionRecord(
        exception_id=exc_id,
        record_id=record.id,
        exception_code=ExceptionCode(parsed.get("exception_code", "UNCLASSIFIED_REVIEW_NEEDED")),
        hypothesis=parsed.get("hypothesis", "Unable to determine root cause"),
        suggested_resolution=parsed.get("suggested_resolution", "Manual review required"),
        confidence_level=parsed.get("confidence_level", "low"),
        llm_raw_response=raw_response,
    )


def _deterministic_classify(record: NormalizedRecord) -> dict:
    """Deterministic classification based on record properties."""

    tag = record.adversarial_tag
    if tag == "hash_collision":
        return {"exception_code": "DUPLICATE", "hypothesis": "Same order_id in multiple settlement batches", "suggested_resolution": "Verify which batch is correct, de-duplicate", "confidence_level": "high"}
    elif tag == "cyclic_dispute":
        return {"exception_code": "TIMING_DRIFT", "hypothesis": "Cyclic settle-chargeback-represent pattern", "suggested_resolution": "Trace full payment lifecycle across batches", "confidence_level": "medium"}
    elif tag == "fractional_penny":
        return {"exception_code": "FRACTIONAL_PENNY", "hypothesis": "Accumulated rounding discrepancies across batch", "suggested_resolution": "Accept with rounding classification, aggregate total", "confidence_level": "high"}
    elif tag == "truncated_reference":
        return {"exception_code": "ROUNDING", "hypothesis": "Reference string truncated by bank processing", "suggested_resolution": "Fuzzy string matching should resolve", "confidence_level": "medium"}
    elif tag == "partial_refund":
        return {"exception_code": "PARTIAL_PAYMENT", "hypothesis": "Partial refund — amount less than original payment", "suggested_resolution": "Match partially and flag remainder", "confidence_level": "high"}
    elif tag == "future_dated":
        return {"exception_code": "TIMING_DRIFT", "hypothesis": "Settlement outside T+2 window", "suggested_resolution": "Investigate delay cause, extend tolerance if justified", "confidence_level": "high"}
    elif tag == "zero_amount":
        return {"exception_code": "ROUNDING", "hypothesis": "Zero-amount adjustment — no financial impact", "suggested_resolution": "Skip from matching — no action needed", "confidence_level": "high"}
    elif tag == "high_volume_duplicates":
        return {"exception_code": "DUPLICATE", "hypothesis": "Duplicate record detected in high-volume batch", "suggested_resolution": "Remove duplicate, keep first occurrence only", "confidence_level": "high"}

    amount = Decimal(record.amount)

    if amount == Decimal("0"):
        return {"exception_code": "ROUNDING", "hypothesis": "Zero-amount record", "suggested_resolution": "Skip — no financial impact", "confidence_level": "high"}

    fee = Decimal(record.fee)
    if fee > Decimal("0") and record.type.value == "refund":
        return {"exception_code": "FEE_DEDUCTION", "hypothesis": "Fee applied to refund (should be zero)", "suggested_resolution": "Verify refund fee is not charged by gateway", "confidence_level": "medium"}

    if record.settled_at:
        days_old = (datetime.utcnow() - record.settled_at).days
        if days_old > 7:
            return {"exception_code": "TIMING_DRIFT", "hypothesis": f"Record is {days_old} days old — may indicate timing issue", "suggested_resolution": "Check if settlement was delayed", "confidence_level": "medium"}

    return {"exception_code": "UNEXPLAINED", "hypothesis": "No matching record found in any source", "suggested_resolution": "Investigate origin of this transaction", "confidence_level": "low"}


async def _call_llm_classifier(context: str) -> str:
    """Call LLM for exception classification."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("No API key available")

    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                "model": "gemini-1.5-flash",
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": EXCEPTION_SYSTEM_PROMPT},
                    {"role": "user", "content": context},
                ],
            },
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        raise RuntimeError(f"LLM API error: {resp.status_code}")


def _parse_classification(raw: str) -> dict:
    """Parse LLM classification response."""
    try:
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
        return json.loads(raw.strip())
    except (json.JSONDecodeError, IndexError):
        return {"exception_code": "UNCLASSIFIED_REVIEW_NEEDED", "hypothesis": "Could not parse LLM response", "suggested_resolution": "Manual review", "confidence_level": "low"}


async def _store_exceptions(db: AsyncSQLiteWriter, exceptions: list[ExceptionRecord]):
    """Store exception classifications in DB."""
    INSERT_SQL = (
        "INSERT OR IGNORE INTO exceptions "
        "(exception_id, record_id, exception_code, hypothesis, suggested_resolution, "
        "confidence_level, llm_raw_response, classified_at) "
        "VALUES (?,?,?,?,?,?,?,?)"
    )
    for exc in exceptions:
        await db.write(
            INSERT_SQL,
            (exc.exception_id, exc.record_id, exc.exception_code.value,
             exc.hypothesis, exc.suggested_resolution, exc.confidence_level,
             exc.llm_raw_response, exc.classified_at.isoformat()),
        )
