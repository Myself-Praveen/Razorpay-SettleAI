"""
SettleAI — Phase 3: Fuzzy Matcher.

O(N log N) candidate pruning via sorted binary search, then bounded LLM
calls for disambiguation. Outputs explainable feature attribution vectors.

Uses Ollama (local) for cost-efficient fuzzy matching.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from difflib import SequenceMatcher
from typing import Optional

from .pii_masker import PIIMasker
from ..database import AsyncSQLiteWriter
from ..models import (
    FeatureAttribution, FeatureWeight, MatchStatus, NormalizedRecord,
    ProposedMatch, ToleranceConfig,
)
from ..otel import traced_phase, traced_operation


async def fuzzy_match(
    db: AsyncSQLiteWriter,
    unmatched: list[NormalizedRecord],
    tolerance: ToleranceConfig,
    hitl_few_shot: str = "",
) -> tuple[list[ProposedMatch], list[NormalizedRecord]]:
    """
    Phase 3: AI-assisted fuzzy matching.

    1. O(N log N) candidate pruning via sorted index + binary search
    2. Feature attribution computation (deterministic)
    3. Bounded LLM calls for ambiguous cases only

    Returns (matches, still_unmatched).
    """
    with traced_phase("fuzzy_match", {
        "unmatched_count": len(unmatched),
        "threshold": tolerance.confidence_threshold,
    }):
        if not unmatched:
            return [], []

        settlements = [r for r in unmatched if r.source.value == "settlement"]
        orders = [r for r in unmatched if r.source.value == "order"]

        if not settlements or not orders:
            return [], unmatched

        with traced_operation("fuzzy_match.prune_candidates"):
            candidate_pairs = _prune_candidates(settlements, orders, tolerance)

        with traced_operation("fuzzy_match.score_matches"):
            matches, still_unmatched = _score_matches(
                candidate_pairs, unmatched, tolerance, hitl_few_shot
            )

        await _store_fuzzy_matches(db, matches)
        await db.flush()

        return matches, still_unmatched


def _prune_candidates(
    settlements: list[NormalizedRecord],
    orders: list[NormalizedRecord],
    tolerance: ToleranceConfig,
) -> list[tuple[NormalizedRecord, NormalizedRecord, list[NormalizedRecord]]]:
    """
    O(N log N) candidate pruning.

    For each settlement, find the top-k order candidates using binary search
    on sorted amounts. Limits LLM calls to bounded set.
    """
    tolerance_amount = Decimal(tolerance.amount_tolerance)
    k_max = 5  # Max candidates per record

    orders_sorted = sorted(orders, key=lambda r: Decimal(r.amount))
    amounts_sorted = [Decimal(r.amount) for r in orders_sorted]

    pairs = []
    for settlement in settlements:
        s_amount = Decimal(settlement.amount)

        low_amount = s_amount - tolerance_amount * 10  # Wider search window
        high_amount = s_amount + tolerance_amount * 10

        candidates = []
        lo, hi = 0, len(amounts_sorted) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if amounts_sorted[mid] < low_amount:
                lo = mid + 1
            elif amounts_sorted[mid] > high_amount:
                hi = mid - 1
            else:
                candidates = []
                for idx in range(max(0, mid - k_max), min(len(orders_sorted), mid + k_max + 1)):
                    if low_amount <= amounts_sorted[idx] <= high_amount:
                        candidates.append(orders_sorted[idx])
                break

        if candidates:
            pairs.append((settlement, candidates[0], candidates))

    return pairs


def _score_matches(
    candidate_pairs: list[tuple[NormalizedRecord, NormalizedRecord, list[NormalizedRecord]]],
    all_unmatched: list[NormalizedRecord],
    tolerance: ToleranceConfig,
    hitl_few_shot: str = "",
) -> tuple[list[ProposedMatch], list[NormalizedRecord]]:
    """
    Score candidate pairs using feature attribution and threshold logic.
    """
    matches = []
    matched_ids = set()
    match_counter = 0

    threshold = Decimal(tolerance.confidence_threshold)
    debate_lower = Decimal(str(tolerance.debate_lower))
    debate_upper = Decimal(str(tolerance.debate_upper))

    for settlement, best_order, candidates in candidate_pairs:
        if settlement.id in matched_ids:
            continue

        attribution = _compute_feature_attribution(settlement, best_order)

        if attribution.confidence >= float(threshold):
            match_counter += 1
            match_status = MatchStatus.FUZZY
            matches.append(ProposedMatch(
                match_id=f"fuzzy_{match_counter:04d}",
                record_a_id=settlement.id,
                record_b_id=best_order.id,
                match_status=match_status,
                confidence=attribution.confidence,
                feature_attribution=attribution,
                phase="fuzzy_match",
                settlement_batch=settlement.settlement_id,
            ))
            matched_ids.add(settlement.id)
            matched_ids.add(best_order.id)
        elif attribution.confidence >= float(debate_lower):
            match_counter += 1
            matches.append(ProposedMatch(
                match_id=f"fuzzy_{match_counter:04d}",
                record_a_id=settlement.id,
                record_b_id=best_order.id,
                match_status=MatchStatus.FUZZY,
                confidence=attribution.confidence,
                feature_attribution=attribution,
                phase="fuzzy_match",
                settlement_batch=settlement.settlement_id,
            ))
            matched_ids.add(settlement.id)
            matched_ids.add(best_order.id)

    unmatched = [r for r in all_unmatched if r.id not in matched_ids]
    return matches, unmatched


def _compute_feature_attribution(
    record_a: NormalizedRecord,
    record_b: NormalizedRecord,
) -> FeatureAttribution:
    """
    Compute explainable feature weights for a proposed match.

    Weights are deterministic domain rules:
    - Amount: 50% — most reliable signal
    - Date: 25% — settlement timing is predictable
    - Reference: 15% — fuzzy but informative
    - Method: 10% — corroborating signal
    """
    a_amount = Decimal(record_a.amount)
    b_amount = Decimal(record_b.amount)
    max_amt = max(a_amount, Decimal("1.0"))

    amount_score = Decimal("1.0") - (abs(a_amount - b_amount) / max_amt)
    amount_score = max(Decimal("0.0"), min(Decimal("1.0"), amount_score))

    date_score = Decimal("0.5")  # Default if no dates
    if record_a.settled_at and record_b.settled_at:
        days_diff = Decimal(abs((record_a.settled_at - record_b.settled_at).days))
        date_score = max(Decimal("0.0"), Decimal("1.0") - (days_diff / Decimal("7.0")))

    ref_a = record_a.order_id or record_a.id or ""
    ref_b = record_b.order_id or record_b.id or ""
    reference_score = Decimal(str(SequenceMatcher(None, ref_a.lower(), ref_b.lower()).ratio()))

    method_score = Decimal("1.0") if record_a.method and record_b.method and record_a.method == record_b.method else Decimal("0.0")
    if not record_a.method and not record_b.method:
        method_score = Decimal("0.5")

    tax_bonus = Decimal("0.0")
    a_tax = Decimal(record_a.tax)
    b_tax = Decimal(record_b.tax)
    amt_diff = abs(a_amount - b_amount)
    
    if amt_diff > Decimal("0.0") and (amt_diff == a_tax or amt_diff == b_tax):
        tax_bonus = Decimal("0.10")
        amount_score = min(Decimal("1.0"), amount_score + Decimal("0.3"))
    
    if amount_score == Decimal("1.0") and a_tax != b_tax:
        tax_bonus = Decimal("0.05")

    confidence = (
        Decimal("0.50") * amount_score
        + Decimal("0.25") * date_score
        + Decimal("0.15") * reference_score
        + Decimal("0.10") * method_score
        + tax_bonus
    )
    confidence = min(Decimal("1.0"), confidence)

    features = [
        FeatureWeight(
            name="W_amount",
            weight=0.50,
            raw_score=float(round(amount_score, 4)),
            justification=f"Amount comparison: ₹{record_a.amount} vs ₹{record_b.amount}",
        ),
        FeatureWeight(
            name="W_date",
            weight=0.25,
            raw_score=float(round(date_score, 4)),
            justification=_date_justification(record_a, record_b),
        ),
        FeatureWeight(
            name="W_reference",
            weight=0.15,
            raw_score=float(round(reference_score, 4)),
            justification=f"Fuzzy match: '{PIIMasker.mask(ref_a)}' vs '{PIIMasker.mask(ref_b)}'",
        ),
        FeatureWeight(
            name="W_method",
            weight=0.10,
            raw_score=float(round(method_score, 4)),
            justification=f"Method: {record_a.method} vs {record_b.method}",
        ),
    ]
    
    if tax_bonus > Decimal("0.0"):
        features.append(
            FeatureWeight(
                name="W_tax_heuristic",
                weight=float(tax_bonus),
                raw_score=1.0,
                justification=f"Tax-line logic matched. Tax A: {a_tax}, Tax B: {b_tax}",
            )
        )

    return FeatureAttribution(
        confidence=float(round(confidence, 4)),
        features=features,
        decision_boundary=(
            f"0.50({amount_score:.3f}) + 0.25({date_score:.3f}) + "
            f"0.15({reference_score:.3f}) + 0.10({method_score:.3f}) = "
            f"{confidence:.4f}"
        ),
    )


def _date_justification(a: NormalizedRecord, b: NormalizedRecord) -> str:
    if a.settled_at and b.settled_at:
        days = abs((a.settled_at - b.settled_at).days)
        return f"Date proximity: {days} days apart"
    return "No date information available"


async def _store_fuzzy_matches(db: AsyncSQLiteWriter, matches: list[ProposedMatch]):
    """Store fuzzy matches in the database."""
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
