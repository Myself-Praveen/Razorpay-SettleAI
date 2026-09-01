"""
SettleAI — Live Razorpay Test Environment API adapter.

Pulls directly from Razorpay Test Environment using authenticated keys.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import AsyncIterator

from .base import DataSourceAdapter


class RazorpayLiveAdapter(DataSourceAdapter):
    """Pulls from Razorpay Test Environment API."""

    BASE_URL = "https://api.razorpay.com/v1"

    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        self.auth = (self.key_id, self.key_secret) if self.key_id else None

    async def stream_records(self) -> AsyncIterator[dict]:
        if not self.auth:
            raise RuntimeError(
                "Razorpay credentials not configured. "
                "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
            )

        import httpx
        async with httpx.AsyncClient(auth=self.auth, timeout=30.0) as client:
            today = datetime.utcnow()
            for days_ago in range(7):
                day = today - timedelta(days=days_ago)
                url = f"{self.BASE_URL}/settlements/recon/combined"
                params = {"year": day.year, "month": day.month, "day": day.day}

                try:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        for item in data.get("items", []):
                            item["_source_date"] = day.isoformat()
                            yield item
                except Exception as e:
                    print(f"Error fetching data for {day}: {e}")

    async def get_metadata(self) -> dict:
        return {
            "mode": "live",
            "api": "Razorpay Test Environment",
            "configured": self.auth is not None,
        }
