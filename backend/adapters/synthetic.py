"""
SettleAI — Synthetic data adapter.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import AsyncIterator

from .base import DataSourceAdapter


class SyntheticAdapter(DataSourceAdapter):
    """Loads from generated JSON files."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self._files = [
            "settlements.json",
            "orders.json",
            "bank_statements.json",
            "gst_records.json",
        ]

    async def stream_records(self) -> AsyncIterator[dict]:
        for filename in self._files:
            path = self.data_dir / filename
            if path.exists():
                with open(path, "r") as f:
                    for record in json.load(f):
                        yield record

    async def get_metadata(self) -> dict:
        counts = {}
        for filename in self._files:
            path = self.data_dir / filename
            if path.exists():
                with open(path, "r") as f:
                    counts[filename] = len(json.load(f))
            else:
                counts[filename] = 0
        return {"mode": "synthetic", "files": counts}
