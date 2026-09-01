"""
SettleAI — Phase 2: Exact Matcher.

O(N log N) deterministic matching using:
1. Sort + two-pointer traversal for amount/date alignment
2. Hash join for reference ID matches (order_id, payment_id, settlement_id)

Complexity: O(N log N) — scales to millions of rows.
"""

from __future__ import annotations

import hashlib
import time
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from ..database import AsyncSQLiteWriter
from ..models import (
    FeatureAttribution, FeatureWeight, MatchStatus, NormalizedRecord,
    ProposedMatch, ToleranceConfig,
)
from ..otel import traced_phase, traced_operation


async def exact_match(
    db: AsyncSQLiteWriter,
    tolerance: ToleranceConfig,
) -> tuple[list[ProposedMatch], list[NormalizedRecord]]:
    """
    Phase 2: Deterministic exact matching.

    Returns (matches, unmatched_records).
    """
    with traced_phase("exact_match", {
        "tolerance": tolerance.amount_tolerance,
        "threshold": tolerance.confidence_threshold,
    }):
        records = await _load_records(db)
        if not records:
            return [], []

        with traced_operation("exact_match.hash_join"):
            matches, matched_ids = await _hash_join_matches(db, records)

        with traced_operation("exact_match.amount_pointer"):
            additional, more_matched = await _two_pointer_matches(
                db, records, matched_ids | matched_ids, tolerance
            )
            matches.extend(additional)
            matched_ids |= more_matched

        unmatched = [r for r in records if r.id not in matched_ids]

        await _store_matches(db, matches)
        await db.flush()

        return matches, unmatched


async def _load_records(db: AsyncSQLiteWriter) -> list[NormalizedRecord]:
    """Load all normalized records from DB."""
    async with db.read() as conn:
        rows = conn.execute(
            "SELECT id, source, amount, type, debit, credit, fee, tax, "
            "settlement_id, order_id, payment_id, settled_at, method, "
            "card_network, currency, description "
            "FROM normalized_records"
        ).fetchall()

    records = []
    for row in rows:
        settled_at = None
        if row[11]:
            try:
                settled_at = datetime.fromisoformat(row[11])
            except (ValueError, TypeError):
                pass

        records.append(NormalizedRecord(
            id=row[0],
            source=row[1],
            amount=row[2],
            type=row[3],
            debit=row[4],
            credit=row[5],
            fee=row[6],
            tax=row[7],
            settlement_id=row[8],
            order_id=row[9],
            payment_id=row[10],
            settled_at=settled_at,
            method=row[12],
            card_network=row[13],
            currency=row[14],
            description=row[15],
        ))

    return records


async def _hash_join_matches(
    db: AsyncSQLiteWriter,
    records: list[NormalizedRecord],
) -> tuple[list[ProposedMatch], set[str]]:
    """
    Hash join on key fields: order_id, payment_id, settlement_id.

    O(N) amortized via hash maps.
    """
    matches = []
    matched_ids = set()

    by_order_id: dict[str, list[NormalizedRecord]] = defaultdict(list)
    by_payment_id: dict[str, list[NormalizedRecord]] = defaultdict(list)
    by_settlement_id: dict[str, list[NormalizedRecord]] = defaultdict(list)

    for r in records:
        if r.order_id:
            by_order_id[r.order_id].append(r)
        if r.payment_id:
            by_payment_id[r.payment_id].append(r)
        if r.settlement_id:
            by_settlement_id[r.settlement_id].append(r)

    match_counter = 0

    for order_id, group in by_order_id.items():
        settlements = [r for r in group if r.source.value == "settlement"]
        orders = [r for r in group if r.source.value == "order"]

        for s in settlements:
            for o in orders:
                if s.id in matched_ids or o.id in matched_ids:
                    continue

                s_amount = Decimal(s.amount)
                o_amount = Decimal(o.amount)

                if s_amount == o_amount:
                    match_counter += 1
                    match_id = f"match_{match_counter:04d}"
                    matches.append(ProposedMatch(
                        match_id=match_id,
                        record_a_id=s.id,
                        record_b_id=o.id,
                        match_status=MatchStatus.EXACT,
                        confidence=1.0,
                        phase="exact_match",
                        settlement_batch=s.settlement_id,
                        feature_attribution=FeatureAttribution(
                            confidence=1.0,
                            features=[
                                FeatureWeight(name="W_amount", weight=0.5, raw_score=1.0,
                                              justification=f"Exact amount: ₹{s.amount}"),
                                FeatureWeight(name="W_key", weight=0.5, raw_score=1.0,
                                              justification=f"Exact order_id match: {order_id}"),
                            ],
                            decision_boundary="Exact match → confidence 1.0 ≥ threshold",
                        ),
                    ))
                    matched_ids.add(s.id)
                    matched_ids.add(o.id)

    for pid, group in by_payment_id.items():
        payments = [r for r in group if r.source.value == "settlement" and r.type.value == "payment"]
        refunds = [r for r in group if r.source.value == "settlement" and r.type.value == "refund"]

        for pay in payments:
            for ref in refunds:
                if pay.id in matched_ids or ref.id in matched_ids:
                    continue

                match_counter += 1
                match_id = f"match_{match_counter:04d}"
                matches.append(ProposedMatch(
                    match_id=match_id,
                    record_a_id=ref.id,
                    record_b_id=pay.id,
                    match_status=MatchStatus.EXACT,
                    confidence=1.0,
                    phase="exact_match",
                    settlement_batch=pay.settlement_id,
                    feature_attribution=FeatureAttribution(
                        confidence=1.0,
                        features=[
                            FeatureWeight(name="W_payment_id", weight=1.0, raw_score=1.0,
                                          justification=f"Exact payment_id: {pid}"),
                        ],
                        decision_boundary="Exact payment_id match",
                    ),
                ))
                matched_ids.add(pay.id)
                matched_ids.add(ref.id)

    return matches, matched_ids


async def _two_pointer_matches(
    db: AsyncSQLiteWriter,
    records: list[NormalizedRecord],
    already_matched: set[str],
    tolerance: ToleranceConfig,
) -> tuple[list[ProposedMatch], set[str]]:
    """
    Two-pointer traversal on sorted (amount, date) for remaining matches.

    O(N log N) sort + O(N) traversal.
    """
    matches = []
    matched_ids = set()
    tolerance_amount = Decimal(tolerance.amount_tolerance)

    settlement_recs = sorted(
        [r for r in records if r.source.value == "settlement"
         and r.id not in already_matched and r.type.value == "payment"],
        key=lambda r: (Decimal(r.amount), r.settled_at or datetime.min),
    )
    order_recs = sorted(
        [r for r in records if r.source.value == "order"
         and r.id not in already_matched],
        key=lambda r: (Decimal(r.amount), r.settled_at or datetime.min),
    )

    match_counter = len(already_matched)

    i, j = 0, 0
    while i < len(settlement_recs) and j < len(order_recs):
        s = settlement_recs[i]
        o = order_recs[j]
        s_amt = Decimal(s.amount)
        o_amt = Decimal(o.amount)

        if abs(s_amt - o_amt) <= tolerance_amount:
            date_ok = True
            if s.settled_at and o.settled_at:
                date_diff = abs((s.settled_at - o.settled_at).days)
                date_ok = date_diff <= tolerance.date_tolerance_days

            if date_ok:
                match_counter += 1
                match_id = f"match_{match_counter:04d}"

                amount_score = 1.0 - float(abs(s_amt - o_amt) / max(s_amt, Decimal("1")))
                date_score = 0.85 if s.settled_at and o.settled_at else 0.5

                confidence = 0.5 * amount_score + 0.25 * date_score + 0.25 * 1.0

                matches.append(ProposedMatch(
                    match_id=match_id,
                    record_a_id=s.id,
                    record_b_id=o.id,
                    match_status=MatchStatus.EXACT,
                    confidence=confidence,
                    phase="exact_match",
                    settlement_batch=s.settlement_id,
                ))
                matched_ids.add(s.id)
                matched_ids.add(o.id)
                i += 1
                j += 1
            elif s.settled_at and o.settled_at and s.settled_at < o.settled_at:
                i += 1
            else:
                j += 1
        elif s_amt < o_amt:
            i += 1
        else:
            j += 1

    return matches, matched_ids


async def _store_matches(db: AsyncSQLiteWriter, matches: list[ProposedMatch]):
    """Store exact matches in the database."""
    INSERT_SQL = (
        "INSERT OR IGNORE INTO matches "
        "(match_id, record_a_id, record_b_id, match_status, confidence, "
        "feature_attribution_json, phase, settlement_batch, proposed_at, verified) "
        "VALUES (?,?,?,?,?,?,?,?,?,0)"
    )
    for m in matches:
        fa_json = m.feature_attribution.model_dump_json() if m.feature_attribution else None
        await db.write(
            INSERT_SQL,
            (m.match_id, m.record_a_id, m.record_b_id, m.match_status.value,
             m.confidence, fa_json, m.phase, m.settlement_batch,
             m.proposed_at.isoformat()),
        )
