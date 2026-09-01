"""
Tests for adversarial dataset handling.
"""

import pytest
from backend.synth.adversarial import AdversarialGenerator


class TestAdversarial:
    def test_generate_all_categories(self):
        gen = AdversarialGenerator(seed=99)
        result = gen.generate(data_dir="data/test")

        assert result["adversarial_count"] > 0
        assert len(result["categories"]) >= 8

    def test_ground_truth_exists(self):
        gen = AdversarialGenerator(seed=99)
        gen.generate(data_dir="data/test")

        assert len(gen.ground_truth) > 0

    def test_hash_collision_records(self):
        gen = AdversarialGenerator(seed=99)
        gen.generate(data_dir="data/test")

        collision_records = [r for r in gen.records if r.get("adversarial_tag") == "hash_collision"]
        assert len(collision_records) == 2

    def test_cyclic_dispute_records(self):
        gen = AdversarialGenerator(seed=99)
        gen.generate(data_dir="data/test")

        cyclic_records = [r for r in gen.records if r.get("adversarial_tag") == "cyclic_dispute"]
        assert len(cyclic_records) == 3

    def test_fractional_penny_records(self):
        gen = AdversarialGenerator(seed=99)
        gen.generate(data_dir="data/test")

        penny_records = [r for r in gen.records if r.get("adversarial_tag") == "fractional_penny"]
        assert len(penny_records) == 8
