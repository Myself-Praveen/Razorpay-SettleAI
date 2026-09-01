"""
SettleAI — Cash Position Forecaster.

Projects forward cash position for the next 7 days based on
reconciled settlement data and pending items.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from .database import AsyncSQLiteWriter
from .models import ForecastResponse


async def forecast_cash_position(
    db: AsyncSQLiteWriter,
    days_ahead: int = 7,
) -> ForecastResponse:
    """Project forward cash position for next N days."""

    async with db.read() as conn:
        rows = conn.execute(
            "SELECT settled_at, credit, debit FROM normalized_records "
            "WHERE source = 'settlement' AND settled_at IS NOT NULL "
            "ORDER BY settled_at"
        ).fetchall()

    async with db.read() as conn:
        pending = conn.execute(
            "SELECT credit, debit FROM normalized_records "
            "WHERE source = 'settlement' AND id NOT IN "
            "(SELECT record_a_id FROM matches WHERE verified = 1 "
            "UNION SELECT record_b_id FROM matches WHERE verified = 1)"
        ).fetchall()

    daily_flows: dict[str, Decimal] = {}
    for row in rows:
        date_str = row[0][:10] if row[0] else None
        if date_str:
            credit = Decimal(str(row[1])) if row[1] else Decimal("0")
            debit = Decimal(str(row[2])) if row[2] else Decimal("0")
            daily_flows[date_str] = daily_flows.get(date_str, Decimal("0")) + credit - debit

    if daily_flows:
        avg_daily = sum(daily_flows.values()) / len(daily_flows)
    else:
        avg_daily = Decimal("0")

    pending_total = sum(
        (Decimal(str(r[0])) if r[0] else Decimal("0")) -
        (Decimal(str(r[1])) if r[1] else Decimal("0"))
        for r in pending
    )

    async with db.read() as conn:
        exceptions_data = conn.execute(
            "SELECT e.exception_id, r.amount FROM exceptions e "
            "JOIN normalized_records r ON e.record_id = r.id"
        ).fetchall()
        
    exception_total = sum(Decimal(str(e[1])) for e in exceptions_data if e[1])

    today = datetime.utcnow().date()
    projections = []
    cumulative = pending_total

    risk_factor = Decimal("0")
    risk_explanation = None
    if exception_total > Decimal("10000"):
        risk_factor = exception_total * Decimal("0.8") # 80% chance won't settle this week
        risk_explanation = f" High-risk alert: {len(exceptions_data)} unresolved exceptions totaling ₹{exception_total}. Liquidity projection dynamically lowered by ₹{risk_factor.quantize(Decimal('0.01'))} to account for non-settlement risk."

    for i in range(days_ahead):
        day = today + timedelta(days=i + 1)
        projected_flow = avg_daily + (pending_total if i == 0 else Decimal("0"))
        
        if i == 0 and risk_factor > 0:
            projected_flow -= risk_factor
            
        cumulative += projected_flow

        projections.append({
            "date": day.isoformat(),
            "projected_flow": float(projected_flow.quantize(Decimal("0.01"))),
            "cumulative_position": float(cumulative.quantize(Decimal("0.01"))),
            "confidence": "high" if i < 3 else "medium" if i < 5 else "low",
        })

    if len(projections) > 0:
        avg_confidence = sum(
            1.0 if p["confidence"] == "high" else 0.6 if p["confidence"] == "medium" else 0.3
            for p in projections
        ) / len(projections)
        confidence_level = "high" if avg_confidence > 0.8 else "medium" if avg_confidence > 0.5 else "low"
    else:
        confidence_level = "low"
        
    if risk_factor > 0:
        confidence_level = "low" # High risk overrides confidence

    return ForecastResponse(
        days=projections,
        confidence_level=confidence_level,
        risk_explanation=risk_explanation,
    )
