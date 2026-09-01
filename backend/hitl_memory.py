"""
SettleAI — Human-in-the-Loop Reinforcement Memory.

When a human operator corrects a flagged exception, the resolution is
serialized into few_shot_memory.json. On subsequent runs, validated
corrections are retrieved and injected as few-shot examples.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import HitlAction


class HITLMemory:
    """Reinforcement memory that learns from human corrections."""

    MEMORY_FILE = Path("data/few_shot_memory.json")

    def __init__(self, memory_file: Optional[Path] = None):
        self.memory_file = memory_file or self.MEMORY_FILE
        self.entries = self._load()

    def _load(self) -> list[dict]:
        if self.memory_file.exists():
            try:
                return json.loads(self.memory_file.read_text())
            except (json.JSONDecodeError, FileNotFoundError):
                return []
        return []

    def _save(self):
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        self.memory_file.write_text(json.dumps(self.entries, indent=2, default=str))

    def record_resolution(
        self,
        exception_id: str,
        exception_code: str,
        record_context: dict,
        human_resolution: str,
        human_action: HitlAction,
    ) -> str:
        """Called when human clicks 'Resolve & Learn' in Exception Explorer."""
        entry_id = f"hitl_{len(self.entries) + 1:04d}"
        entry = {
            "id": entry_id,
            "timestamp": datetime.utcnow().isoformat(),
            "exception_id": exception_id,
            "exception_code": exception_code,
            "context": record_context,
            "human_resolution": human_resolution,
            "human_action": human_action.value,
        }
        self.entries.append(entry)
        self._save()
        return entry_id

    def retrieve_similar(
        self,
        exception_code: str,
        record_context: dict,
        top_k: int = 3,
    ) -> list[dict]:
        """Retrieve human corrections similar to the current exception."""
        candidates = [e for e in self.entries if e["exception_code"] == exception_code]

        scored = []
        for entry in candidates:
            score = self._compute_similarity(record_context, entry["context"])
            scored.append((score, entry))

        scored.sort(reverse=True, key=lambda x: x[0])
        return [entry for _, entry in scored[:top_k]]

    def build_few_shot_prompt(
        self,
        exception_code: str,
        record_context: dict,
    ) -> str:
        """Build few-shot examples for the LLM prompt."""
        similar = self.retrieve_similar(exception_code, record_context)

        if not similar:
            return ""

        examples = "\n".join([
            f"Example {i + 1}:\n"
            f"  Context: {json.dumps(ex['context'], default=str)[:200]}\n"
            f"  Human Resolution: {ex['human_resolution']}\n"
            f"  Action: {ex['human_action']}"
            for i, ex in enumerate(similar)
        ])

        return f"Human-corrected examples for similar exceptions:\n{examples}\nUse these as reference."

    def _compute_similarity(self, ctx_a: dict, ctx_b: dict) -> float:
        """Simple feature-based similarity (no vector DB needed for demo scale)."""
        score = 0.0

        try:
            amt_a = float(ctx_a.get("amount", 0))
            amt_b = float(ctx_b.get("amount", 0))
            if amt_a > 0 and amt_b > 0:
                ratio = min(amt_a, amt_b) / max(amt_a, amt_b)
                score += ratio * 0.4
        except (ValueError, TypeError):
            pass

        if ctx_a.get("source") == ctx_b.get("source"):
            score += 0.2

        if ctx_a.get("type") == ctx_b.get("type"):
            score += 0.2

        if ctx_a.get("method") == ctx_b.get("method"):
            score += 0.1

        id_a = ctx_a.get("id", "")[:5]
        id_b = ctx_b.get("id", "")[:5]
        if id_a == id_b:
            score += 0.1

        return score

    @property
    def size(self) -> int:
        return len(self.entries)
