"""
SettleAI — Confidence Router.

Routes records between auto-accept, multi-agent debate, and exception
classification based on dynamic confidence thresholds.
"""

from __future__ import annotations

from ..models import ProposedMatch, ToleranceConfig


def route_match(
    match: ProposedMatch,
    tolerance: ToleranceConfig,
) -> str:
    """
    Route a match based on confidence and batch tolerance.

    Returns: "accept" | "debate" | "exception"
    """
    confidence = match.confidence
    threshold = float(tolerance.confidence_threshold)
    debate_lower = tolerance.debate_lower
    debate_upper = tolerance.debate_upper

    if confidence >= threshold:
        return "accept"
    elif confidence >= debate_lower:
        return "debate"
    else:
        return "exception"


def route_batch(
    matches: list[ProposedMatch],
    tolerance: ToleranceConfig,
) -> dict[str, list[ProposedMatch]]:
    """Route a batch of matches into three buckets."""
    result = {"accept": [], "debate": [], "exception": []}

    for match in matches:
        bucket = route_match(match, tolerance)
        result[bucket].append(match)

    return result
