"""
SettleAI — Settlement Q&A Agent.

Conversational agent that converts natural language questions about
reconciliation results into SQL queries, executed through the zero-trust
SQL firewall.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from .database import AsyncSQLiteWriter
from .models import QARequest, QAResponse
from .zero_trust_sql import SQLFirewall
from .otel import traced_operation

SYSTEM_PROMPT = """You are a financial reconciliation expert. Convert the user's
natural language question into a SQL query against the reconciliation database.

Tables available:
- normalized_records (id, source, amount, type, debit, credit, fee, tax, settlement_id, order_id, payment_id, settled_at, method, card_network, currency)
- matches (match_id, record_a_id, record_b_id, match_status, confidence, feature_attribution_json, phase, verified)
- exceptions (exception_id, record_id, exception_code, hypothesis, suggested_resolution, confidence_level)
- rejections (match_id, record_a_id, record_b_id, reason, detail)

CRITICAL RULES:
- To answer "Why didn't order X settle?" or "Why did order X fail?", query the `exceptions` table joining `normalized_records` on id, and select hypothesis, suggested_resolution, and exception_code. For matches, select `feature_attribution_json`.
- ALWAYS output ONLY a valid SQL SELECT query. No explanations. No markdown formatting.
"""


async def answer_question(
    question: str,
    db: AsyncSQLiteWriter,
    firewall: SQLFirewall,
) -> QAResponse:
    """Convert natural language question to SQL and execute safely."""

    with traced_operation("qa_agent.query"):
        sql = await _nl_to_sql(question)

        is_safe, reason = firewall.check_query(sql)
        if not is_safe:
            return QAResponse(
                answer=f" Query Sandbox Blocked: {reason}",
                sql_query=sql,
                blocked=True,
                block_reason=reason,
            )

        success, result = firewall.execute_safe(sql)
        if not success:
            return QAResponse(
                answer=f"Query error: {result}",
                sql_query=sql,
                blocked=False,
            )

        answer = _format_answer(question, result, sql)
        return QAResponse(
            answer=answer,
            sql_query=sql,
            blocked=False,
        )


async def _nl_to_sql(question: str) -> str:
    """Convert natural language to SQL via LLM."""
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
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": question},
                        ],
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    return _fallback_nl_to_sql(question)


def _fallback_nl_to_sql(question: str) -> str:
    """Keyword-based SQL generation fallback."""
    import re
    q = question.lower()

    order_match = re.search(r'(ord-\w+)', q)
    if order_match and ("why" in q or "fail" in q or "settle" in q):
        order_id = order_match.group(1).upper()
        return f"SELECT e.hypothesis, e.suggested_resolution, e.exception_code FROM exceptions e JOIN normalized_records r ON e.record_id = r.id WHERE r.order_id = '{order_id}'"

    if "exception" in q and "count" in q:
        return "SELECT exception_code, COUNT(*) as count FROM exceptions GROUP BY exception_code"
    if "exception" in q:
        return "SELECT * FROM exceptions LIMIT 20"
    if "match" in q and "rate" in q:
        return "SELECT COUNT(CASE WHEN verified = 1 THEN 1 END) * 100.0 / COUNT(*) as match_rate FROM matches"
    if "match" in q:
        return "SELECT * FROM matches WHERE verified = 1 LIMIT 20"
    if "settlement" in q or "settle" in q:
        return "SELECT * FROM normalized_records WHERE source = 'settlement' LIMIT 20"
    if "reject" in q:
        return "SELECT * FROM rejections LIMIT 20"
    if "order" in q:
        return "SELECT * FROM normalized_records WHERE source = 'order' LIMIT 20"
    if "fee" in q or "mdr" in q:
        return "SELECT * FROM normalized_records WHERE fee > 0 LIMIT 20"

    return "SELECT COUNT(*) as total_records FROM normalized_records"


def _format_answer(question: str, result_str: str, sql: str) -> str:
    """Format SQL result into a readable answer."""
    try:
        results = json.loads(result_str.replace("'", '"'))
    except (json.JSONDecodeError, TypeError):
        return f"Result: {result_str}"

    if not results:
        return "No records found matching your query."

    if len(results) == 1 and len(results[0]) == 1:
        value = list(results[0].values())[0]
        return f"The answer is: {value}"

    if len(results) <= 10:
        lines = [json.dumps(r, indent=2, default=str) for r in results]
        return "\n\n".join(lines)
    else:
        return f"Found {len(results)} records. Here are the first few:\n" + json.dumps(results[:3], indent=2, default=str)
