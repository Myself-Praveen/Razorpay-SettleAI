"""
SettleAI — Concurrent DAG State Machine Orchestrator.

Runs the 5-phase reconciliation pipeline with:
- asyncio.gather for parallel Phase 1 normalization
- Crash recovery via WAL checkpoints
- SSE streaming progress updates
"""

from __future__ import annotations

import asyncio
import json
import time
import psutil
from datetime import datetime
from typing import AsyncIterator, Optional

from .database import AsyncSQLiteWriter, save_checkpoint, get_last_checkpoint
from .models import (
    BatchProfileAnalysis, DebateResult, ExceptionRecord, PipelinePhase,
    PipelineProgress, ProposedMatch, ReconciliationReport, ToleranceConfig,
    VerificationRejection, VerifiedMatch,
)
from .tolerance import DynamicToleranceEngine
from .otel import traced_phase, clear_traces
from .agents.normalizer import normalize_all_sources
from .agents.exact_matcher import exact_match
from .agents.fuzzy_matcher import fuzzy_match
from .agents.confidence_router import route_batch
from .agents.debate import run_debate
from .agents.exception_classifier import classify_exceptions
from .agents.verification import verify_all
from .hitl_memory import HITLMemory


class ReconciliationDAG:
    """
    Concurrent DAG orchestrator for the reconciliation pipeline.

    Each phase writes a checkpoint. On crash recovery, the pipeline
    resumes from the last valid checkpoint.
    """

    def __init__(self, db: AsyncSQLiteWriter):
        self.db = db
        self.tolerance_engine = DynamicToleranceEngine()
        self.hitl_memory = HITLMemory()
        self.start_time: Optional[float] = None
        self._progress_callback = None

    def on_progress(self, callback):
        """Register a callback for SSE streaming."""
        self._progress_callback = callback

    async def _emit_progress(self, progress: PipelineProgress):
        if self._progress_callback:
            await self._progress_callback(progress)

    async def run(
        self,
        data_dir: str = "data",
        skip_normalize: bool = False,
    ) -> ReconciliationReport:
        """
        Run the full reconciliation pipeline.

        Checks for crash recovery first.
        """
        clear_traces()
        self.start_time = time.monotonic()

        checkpoint = await get_last_checkpoint(self.db)
        if checkpoint and checkpoint.phase != PipelinePhase.VERIFY:
            resume_from = checkpoint.phase
        else:
            resume_from = None

        if not skip_normalize and (resume_from is None or resume_from == PipelinePhase.NORMALIZE):
            record_count = await self._run_phase_normalize(data_dir)
            await save_checkpoint(self.db, PipelinePhase.NORMALIZE, {"record_count": record_count})
            await self.db.flush()

        from .agents.exact_matcher import _load_records
        all_records = await _load_records(self.db)
        profile = self.tolerance_engine.analyze(all_records)
        tolerance = profile.tolerance_config

        matches = []
        unmatched = []
        if resume_from is None or resume_from in (PipelinePhase.NORMALIZE, PipelinePhase.EXACT_MATCH):
            matches, unmatched = await self._run_phase_exact(tolerance)
            await save_checkpoint(self.db, PipelinePhase.EXACT_MATCH, {
                "matches": len(matches), "unmatched": len(unmatched)
            })

        fuzzy_matches = []
        if resume_from is None or resume_from in (PipelinePhase.EXACT_MATCH, PipelinePhase.FUZZY_MATCH):
            fuzzy_matches, unmatched_after_fuzzy = await self._run_phase_fuzzy(unmatched, tolerance)
            unmatched = unmatched_after_fuzzy

            await save_checkpoint(self.db, PipelinePhase.FUZZY_MATCH, {
                "fuzzy_matches": len(fuzzy_matches), "unmatched": len(unmatched)
            })

        all_matches = matches + fuzzy_matches

        routed = route_batch(all_matches, tolerance)
        debates: list[DebateResult] = []

        for match in routed["debate"]:
            record_a = next((r for r in all_records if r.id == match.record_a_id), None)
            record_b = next((r for r in all_records if r.id == match.record_b_id), None)
            if record_a and record_b:
                debate_result = await run_debate(match, record_a, record_b, self.db, tolerance)
                debates.append(debate_result)

        exceptions = []
        if resume_from is None or resume_from in (PipelinePhase.FUZZY_MATCH, PipelinePhase.CLASSIFY):
            exceptions = await self._run_phase_classify(unmatched, tolerance)
            await save_checkpoint(self.db, PipelinePhase.CLASSIFY, {
                "exceptions": len(exceptions)
            })

        verified, rejections = [], []
        if resume_from is None or resume_from in (PipelinePhase.CLASSIFY, PipelinePhase.VERIFY):
            verified, rejections = await self._run_phase_verify(all_matches, exceptions, tolerance)
            await save_checkpoint(self.db, PipelinePhase.VERIFY, {
                "verified": len(verified), "rejections": len(rejections)
            })

        total = len(all_records)
        matched_count = len(verified)
        exception_count = len(exceptions)
        match_rate = matched_count / total if total > 0 else 0
        elapsed = (time.monotonic() - self.start_time) * 1000
        throughput = total / (elapsed / 1000) if elapsed > 0 else 0

        report = ReconciliationReport(
            report_id=f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            generated_at=datetime.utcnow(),
            batch_profile=profile,
            total_records=total,
            total_sources=4,
            matched_count=matched_count,
            exception_count=exception_count,
            rejected_count=len(rejections),
            match_rate=round(match_rate, 4),
            throughput_records_per_sec=round(throughput, 2),
            pipeline_duration_ms=round(elapsed, 2),
            tolerance_config=tolerance,
            matches=verified,
            exceptions=exceptions,
            rejections=rejections,
            debates=debates,
            audit_hash=report_hash(verified),
        )

        return report

    async def _run_phase_normalize(self, data_dir: str) -> int:
        with traced_phase("phase1_normalize"):
            progress = PipelineProgress(
                phase=PipelinePhase.NORMALIZE, phase_name="Normalize",
                progress=0.0, records_processed=0, total_records=0,
                matches_found=0, exceptions_found=0,
                current_step="Loading data sources", memory_mb=_mem_mb(),
                elapsed_ms=_elapsed(self.start_time),
            )
            await self._emit_progress(progress)

            count = await normalize_all_sources(self.db, data_dir)

            progress.progress = 1.0
            progress.records_processed = count
            progress.total_records = count
            progress.current_step = f"Normalized {count} records"
            await self._emit_progress(progress)

            return count

    async def _run_phase_exact(self, tolerance: ToleranceConfig) -> tuple:
        with traced_phase("phase2_exact"):
            progress = PipelineProgress(
                phase=PipelinePhase.EXACT_MATCH, phase_name="Exact Match",
                progress=0.0, records_processed=0, total_records=0,
                matches_found=0, exceptions_found=0,
                current_step="Hash join + two-pointer traversal", memory_mb=_mem_mb(),
                elapsed_ms=_elapsed(self.start_time),
            )
            await self._emit_progress(progress)

            matches, unmatched = await exact_match(self.db, tolerance)

            progress.progress = 1.0
            progress.matches_found = len(matches)
            progress.records_processed = len(matches)
            progress.current_step = f"Found {len(matches)} exact matches"
            await self._emit_progress(progress)

            return matches, unmatched

    async def _run_phase_fuzzy(self, unmatched, tolerance) -> tuple:
        with traced_phase("phase3_fuzzy"):
            progress = PipelineProgress(
                phase=PipelinePhase.FUZZY_MATCH, phase_name="Fuzzy Match",
                progress=0.0, records_processed=0, total_records=len(unmatched),
                matches_found=0, exceptions_found=0,
                current_step="O(N log N) candidate pruning + feature attribution",
                memory_mb=_mem_mb(), elapsed_ms=_elapsed(self.start_time),
            )
            await self._emit_progress(progress)

            few_shot = self.hitl_memory.build_few_shot_prompt("", {})
            matches, still_unmatched = await fuzzy_match(self.db, unmatched, tolerance, few_shot)

            progress.progress = 1.0
            progress.matches_found = len(matches)
            progress.records_processed = len(matches)
            progress.current_step = f"Found {len(matches)} fuzzy matches"
            await self._emit_progress(progress)

            return matches, still_unmatched

    async def _run_phase_classify(self, unmatched, tolerance) -> list:
        with traced_phase("phase4_classify"):
            progress = PipelineProgress(
                phase=PipelinePhase.CLASSIFY, phase_name="Classify",
                progress=0.0, records_processed=0, total_records=len(unmatched),
                matches_found=0, exceptions_found=0,
                current_step="AI exception classification", memory_mb=_mem_mb(),
                elapsed_ms=_elapsed(self.start_time),
            )
            await self._emit_progress(progress)

            exceptions = await classify_exceptions(self.db, unmatched, tolerance, self.hitl_memory)

            progress.progress = 1.0
            progress.exceptions_found = len(exceptions)
            progress.records_processed = len(exceptions)
            progress.current_step = f"Classified {len(exceptions)} exceptions"
            await self._emit_progress(progress)

            return exceptions

    async def _run_phase_verify(self, matches, exceptions, tolerance) -> tuple:
        with traced_phase("phase5_verify"):
            progress = PipelineProgress(
                phase=PipelinePhase.VERIFY, phase_name="Verify",
                progress=0.0, records_processed=0, total_records=len(matches),
                matches_found=0, exceptions_found=0,
                current_step="Double-entry arithmetic verification",
                memory_mb=_mem_mb(), elapsed_ms=_elapsed(self.start_time),
            )
            await self._emit_progress(progress)

            verified, rejections = await verify_all(self.db, matches, exceptions, tolerance)

            progress.progress = 1.0
            progress.matches_found = len(verified)
            progress.records_processed = len(verified)
            progress.current_step = f"Verified {len(verified)}, rejected {len(rejections)}"
            await self._emit_progress(progress)

            return verified, rejections


def _mem_mb() -> float:
    try:
        import psutil
        return psutil.Process().memory_info().rss / 1024 / 1024
    except Exception:
        return 0.0


def _elapsed(start: Optional[float]) -> float:
    if start is None:
        return 0.0
    return (time.monotonic() - start) * 1000


def report_hash(matches: list) -> str:
    """SHA-256 of the match table."""
    import hashlib
    data = json.dumps(
        [{"id": m.match_id, "a": m.record_a_id, "b": m.record_b_id} for m in matches],
        sort_keys=True,
    )
    return hashlib.sha256(data.encode()).hexdigest()
