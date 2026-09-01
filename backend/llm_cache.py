"""
SettleAI — LLM Idempotency Cache.

Caches LLM responses keyed by (prompt_hash, model).
On crash recovery, cached responses are returned instantly instead of
re-calling the LLM, making the pipeline replay-safe.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Optional

from .database import AsyncSQLiteWriter


class LLMCache:
    """Cache for LLM responses — ensures idempotent replay."""

    def __init__(self, db: AsyncSQLiteWriter):
        self.db = db
        self.hits = 0
        self.misses = 0

    async def get_or_compute(
        self,
        prompt: str,
        model: str,
        compute_fn,
    ) -> str:
        """Get cached response or compute and cache."""
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()

        async with self.db.read() as conn:
            row = conn.execute(
                "SELECT response FROM llm_cache WHERE prompt_hash = ? AND model = ?",
                (prompt_hash, model),
            ).fetchone()

        if row:
            self.hits += 1
            return row[0]

        self.misses += 1
        response = await compute_fn(prompt)

        await self.db.write(
            "INSERT OR IGNORE INTO llm_cache (prompt_hash, model, response, created_at) VALUES (?,?,?,?)",
            (prompt_hash, model, response, datetime.utcnow().isoformat()),
        )

        return response

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0
