"""
Tests for HITL reinforcement memory.
"""

import pytest
import tempfile
from pathlib import Path
from backend.hitl_memory import HITLMemory
from backend.models import HitlAction


class TestHITLMemory:
    def test_record_and_retrieve(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            mem = HITLMemory(Path(tmpdir) / "test_memory.json")

            entry_id = mem.record_resolution(
                exception_id="exc_001",
                exception_code="FRACTIONAL_PENNY",
                record_context={"amount": "10000", "source": "settlement"},
                human_resolution="Accept with ROUNDING classification",
                human_action=HitlAction.ACCEPTED_AS_IS,
            )

            assert entry_id.startswith("hitl_")
            assert mem.size == 1

    def test_few_shot_prompt_generation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            mem = HITLMemory(Path(tmpdir) / "test_memory.json")

            mem.record_resolution(
                exception_id="exc_001",
                exception_code="ROUNDING",
                record_context={"amount": "100", "source": "settlement"},
                human_resolution="Accept rounding within tolerance",
                human_action=HitlAction.ACCEPTED_AS_IS,
            )

            prompt = mem.build_few_shot_prompt("ROUNDING", {"amount": "95"})
            assert "Accept rounding" in prompt
