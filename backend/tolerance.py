"""
SettleAI — Dynamic tolerance engine.

Analyzes batch characteristics and sets adaptive tolerance parameters
based on the merchant's transaction profile.
"""

from __future__ import annotations

import statistics
from decimal import Decimal
from typing import Optional

from .models import (
    BatchProfile, BatchProfileAnalysis, NormalizedRecord, ToleranceConfig,
)


class DynamicToleranceEngine:
    """
    Computes dynamic tolerance parameters based on batch characteristics.

    Micro-transactions (avg < ₹1,000):
      → Tight amount tolerance (₹0.01)
      → Lower confidence threshold (0.80)

    High-value B2B (avg > ₹1,00,000):
      → Tighter confidence threshold (0.95)
      → Wider amount tolerance (₹10)

    Standard / Mixed:
      → Balanced defaults (0.85 threshold, ₹1 tolerance)
    """

    def analyze(self, records: list[NormalizedRecord]) -> BatchProfileAnalysis:
        if not records:
            return self._empty_profile()

        amounts = [float(r.amount) for r in records if float(r.amount) > 0]
        if not amounts:
            return self._empty_profile()

        avg = sum(amounts) / len(amounts)
        med = statistics.median(amounts)
        std = statistics.stdev(amounts) if len(amounts) > 1 else 0
        cv = std / avg if avg > 0 else 1.0

        profile = self._classify(avg, cv)
        tolerance = self._compute_tolerance(profile, avg, cv, len(amounts))

        return BatchProfileAnalysis(
            avg_amount=str(Decimal(str(round(avg, 2)))),
            median_amount=str(Decimal(str(round(med, 2)))),
            std_dev=str(Decimal(str(round(std, 2)))),
            cv=str(Decimal(str(round(cv, 4)))),
            transaction_count=len(amounts),
            profile_type=profile,
            tolerance_config=tolerance,
        )

    def _classify(self, avg: float, cv: float) -> BatchProfile:
        if avg < 1000:
            return BatchProfile.MICRO
        elif avg > 100000:
            return BatchProfile.HIGH_VALUE
        elif cv > 2.0:
            return BatchProfile.MIXED
        else:
            return BatchProfile.STANDARD

    def _compute_tolerance(
        self, profile: BatchProfile, avg: float, cv: float, count: int,
    ) -> ToleranceConfig:
        configs = {
            BatchProfile.MICRO: ToleranceConfig(
                amount_tolerance="0.01",
                confidence_threshold="0.80",
                date_tolerance_days=2,
                fuzzy_reference_threshold=0.6,
                debate_lower=0.55,
                debate_upper=0.80,
                profile_type=BatchProfile.MICRO,
                cv=str(round(cv, 4)),
            ),
            BatchProfile.STANDARD: ToleranceConfig(
                amount_tolerance="1.00",
                confidence_threshold="0.85",
                date_tolerance_days=3,
                fuzzy_reference_threshold=0.5,
                debate_lower=0.60,
                debate_upper=0.85,
                profile_type=BatchProfile.STANDARD,
                cv=str(round(cv, 4)),
            ),
            BatchProfile.HIGH_VALUE: ToleranceConfig(
                amount_tolerance="10.00",
                confidence_threshold="0.95",
                date_tolerance_days=2,
                fuzzy_reference_threshold=0.7,
                debate_lower=0.80,
                debate_upper=0.95,
                profile_type=BatchProfile.HIGH_VALUE,
                cv=str(round(cv, 4)),
            ),
            BatchProfile.MIXED: ToleranceConfig(
                amount_tolerance="1.00",
                confidence_threshold="0.85",
                date_tolerance_days=3,
                fuzzy_reference_threshold=0.5,
                debate_lower=0.60,
                debate_upper=0.85,
                profile_type=BatchProfile.MIXED,
                cv=str(round(cv, 4)),
            ),
        }

        config = configs[profile]

        if cv < 0.3:
            config.amount_tolerance = "0.01"

        return config

    def _empty_profile(self) -> BatchProfileAnalysis:
        return BatchProfileAnalysis(
            avg_amount="0",
            median_amount="0",
            std_dev="0",
            cv="0",
            transaction_count=0,
            profile_type=BatchProfile.STANDARD,
            tolerance_config=ToleranceConfig(
                amount_tolerance="1.00",
                confidence_threshold="0.85",
                profile_type=BatchProfile.STANDARD,
            ),
        )
