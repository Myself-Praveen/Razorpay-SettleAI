"""
SettleAI — Multi-Agent Confidence Debate.

For borderline matches (confidence 0.60–0.85), routes the record through
a Merchant Agent (seeking to maximize match rates) and an Auditor Agent
(strictly defending the ledger), with a Synthesis Agent deciding the outcome.

This showcases advanced multi-agent orchestration rather than a simple
linear prompt chain.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Optional

from ..database import AsyncSQLiteWriter
from ..models import (
    DebateResult, ExceptionCode, MatchStatus, NormalizedRecord,
    ProposedMatch, ToleranceConfig,
)
from ..otel import traced_operation
from .pii_masker import PIIMasker


MERCHANT_SYSTEM = """You are the Merchant Agent in a financial reconciliation debate.
Your goal is to MAXIMIZE legitimate match rates.

For the given record pair, argue WHY they should be matched.
Consider: amount proximity, date alignment, reference similarity, historical patterns.
Be persuasive but factual. If you cannot find strong evidence for a match, say so honestly.

Output a JSON object:
{"argument": "Your argument for matching", "evidence_points": ["point1", "point2"], "confidence": 0.0-1.0}"""

AUDITOR_SYSTEM = """You are the Auditor Agent in a financial reconciliation debate.
Your goal is to DEFEND LEDGER INTEGRITY.

For the given record pair, argue WHY they should NOT be matched.
Consider: amount discrepancies, timing anomalies, missing references, potential duplicates.
Be rigorous and skeptical. If the match is clearly valid, acknowledge that.

Output a JSON object:
{"argument": "Your argument against matching", "evidence_points": ["point1", "point2"], "confidence": 0.0-1.0}"""

SYNTHESIS_SYSTEM = """You are the Synthesis Agent. You have heard arguments from both
the Merchant Agent (pro-match) and the Auditor Agent (anti-match).

Evaluate the evidence from both sides and make a final decision.

Output a JSON object:
{
  "verdict": "MATCH" or "EXCEPTION",
  "adjusted_confidence": 0.0-1.0,
  "reasoning": "Brief summary of your decision",
  "merchant_summary": "Summary of merchant argument",
  "auditor_summary": "Summary of auditor argument"
}"""


async def run_debate(
    match: ProposedMatch,
    record_a: NormalizedRecord,
    record_b: NormalizedRecord,
    db: AsyncSQLiteWriter,
    tolerance: ToleranceConfig,
) -> DebateResult:
    """
    Execute a Merchant vs Auditor debate for a borderline match.

    Uses LLM for both agents + synthesis. Falls back to auditor-default
    (reject) if LLM is unavailable.
    """
    context = f"""
Record A: {PIIMasker.mask(record_a.id)} | ₹{record_a.amount} | {record_a.type.value} | {record_a.source.value}
  Settlement: {PIIMasker.mask(record_a.settlement_id) if record_a.settlement_id else 'None'} | Order: {PIIMasker.mask(record_a.order_id) if record_a.order_id else 'None'} | Date: {record_a.settled_at}

Record B: {PIIMasker.mask(record_b.id)} | ₹{record_b.amount} | {record_b.type.value} | {record_b.source.value}
  Settlement: {PIIMasker.mask(record_b.settlement_id) if record_b.settlement_id else 'None'} | Order: {PIIMasker.mask(record_b.order_id) if record_b.order_id else 'None'} | Date: {record_b.settled_at}

Initial confidence: {match.confidence}
Feature attribution: {json.dumps([f.model_dump() for f in match.feature_attribution.features], indent=2) if match.feature_attribution else 'N/A'}
"""

    try:
        merchant_arg = await _call_llm(MERCHANT_SYSTEM, context)
        auditor_arg = await _call_llm(AUDITOR_SYSTEM, context)

        synthesis_input = f"{context}\n\nMERCHANT ARGUMENT:\n{merchant_arg}\n\nAUDITOR ARGUMENT:\n{auditor_arg}"
        synthesis_raw = await _call_llm(SYNTHESIS_SYSTEM, synthesis_input)

        decision = _parse_synthesis(synthesis_raw)
    except Exception as e:
        decision = {
            "verdict": "EXCEPTION",
            "adjusted_confidence": match.confidence * 0.8,
            "reasoning": f"LLM unavailable ({e}), defaulting to conservative reject",
            "merchant_summary": "N/A",
            "auditor_summary": "Default conservative reject",
        }
        merchant_arg = f"Error: {e}"
        auditor_arg = "Default: reject uncertain matches for safety"

    result = DebateResult(
        match_id=match.match_id,
        record_a_id=match.record_a_id,
        record_b_id=match.record_b_id,
        initial_confidence=match.confidence,
        verdict=decision.get("verdict", "EXCEPTION"),
        adjusted_confidence=decision.get("adjusted_confidence", 0.5),
        merchant_argument=merchant_arg if isinstance(merchant_arg, str) else json.dumps(merchant_arg),
        auditor_argument=auditor_arg if isinstance(auditor_arg, str) else json.dumps(auditor_arg),
        synthesis_reasoning=decision.get("reasoning", ""),
    )

    await db.write(
        "INSERT OR IGNORE INTO debates "
        "(match_id, record_a_id, record_b_id, initial_confidence, verdict, "
        "adjusted_confidence, merchant_argument, auditor_argument, "
        "synthesis_reasoning, debated_at) "
        "VALUES (?,?,?,?,?,?,?,?,?,?)",
        (result.match_id, result.record_a_id, result.record_b_id,
         result.initial_confidence, result.verdict, result.adjusted_confidence,
         result.merchant_argument, result.auditor_argument,
         result.synthesis_reasoning, result.debated_at.isoformat()),
    )

    return result


async def _call_llm(system_prompt: str, user_input: str) -> str:
    """
    Call LLM with fallback. Tries OpenAI first, falls back to deterministic.
    """
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "temperature": 0,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_input},
                        ],
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            pass

    return json.dumps({
        "argument": "Deterministic fallback: insufficient data for LLM debate",
        "evidence_points": ["LLM unavailable"],
        "confidence": 0.5,
    })


def _parse_synthesis(raw: str) -> dict:
    """Parse the synthesis agent's JSON response."""
    try:
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]

        return json.loads(raw.strip())
    except (json.JSONDecodeError, IndexError):
        return {
            "verdict": "EXCEPTION",
            "adjusted_confidence": 0.5,
            "reasoning": f"Could not parse synthesis response",
            "merchant_summary": "N/A",
            "auditor_summary": "N/A",
        }
