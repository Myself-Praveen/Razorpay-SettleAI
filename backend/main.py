"""
SettleAI — Main FastAPI Application.

Provides REST API, SSE streaming, WebSocket endpoints for the
reconciliation pipeline, Q&A agent, MCP server, and dashboard.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .database import AsyncSQLiteWriter, get_match_count, get_exception_count, get_rejection_count
from .dag import ReconciliationDAG
from .models import (
    DebateResult, ExceptionRecord, GenerateDataRequest, GenerateDataResponse,
    HealthResponse, MetricsResponse, QARequest, QAResponse,
    ResolveExceptionRequest, ResolveExceptionResponse,
    BatchProfileAnalysis, ReconciliationReport, ToleranceConfig,
    VerificationRejection, VerifiedMatch,
)
from .reports import save_report
from .otel import setup as setup_otel, get_trace_timeline, get_phase_timings, install_langchain_instrumentation
from .qa_agent import answer_question
from .zero_trust_sql import SQLFirewall
from .forecast import forecast_cash_position
from .mcp_server import MCPServer
from .hitl_memory import HITLMemory
from .tolerance import DynamicToleranceEngine


db: AsyncSQLiteWriter = None
mcp: MCPServer = None
firewall: SQLFirewall = None
start_time: float = 0
_last_report: ReconciliationReport = None
_pipeline_events: list[dict] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    global db, mcp, firewall, start_time

    db = AsyncSQLiteWriter()
    await db.initialize()
    mcp = MCPServer(db)
    firewall = SQLFirewall()
    start_time = time.time()

    setup_otel()
    install_langchain_instrumentation()

    yield

    await db.stop_writer()



app = FastAPI(
    title="SettleAI",
    description="Production-Grade AI Finance Reconciliation Agent",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.post("/api/generate-data", response_model=GenerateDataResponse)
async def generate_data(req: GenerateDataRequest):
    """Generate synthetic data + adversarial dataset."""
    from .synth.generator import SyntheticDataGenerator
    from .synth.adversarial import AdversarialGenerator
    from .tolerance import DynamicToleranceEngine
    from .agents.normalizer import normalize_all_sources

    gen = SyntheticDataGenerator(seed=42)
    counts = gen.generate(total_records=req.record_count, data_dir="data")

    if req.include_adversarial:
        adv = AdversarialGenerator(seed=99)
        adv_counts = adv.generate(data_dir="data")
        counts.update(adv_counts)
    else:
        counts["adversarial_count"] = 0

    await db.stop_writer()
    db_path = Path("data/settleai.db")
    if db_path.exists():
        db_path.unlink()
    await db.initialize()

    record_count = await normalize_all_sources(db, "data")

    from .agents.exact_matcher import _load_records
    records = await _load_records(db)
    engine = DynamicToleranceEngine()
    profile = engine.analyze(records)

    return GenerateDataResponse(
        total_records=record_count,
        settlement_count=counts.get("settlement_count", 0),
        order_count=counts.get("order_count", 0),
        bank_count=counts.get("bank_count", 0),
        gst_count=counts.get("gst_count", 0),
        adversarial_count=counts.get("adversarial_count", 0),
        batch_profile=profile,
    )



@app.post("/api/reconcile")
async def reconcile(data_dir: str = "data"):
    """Run the full reconciliation pipeline with SSE streaming."""
    global _last_report

    async def event_stream():
        global _last_report
        dag = ReconciliationDAG(db)
        progress_list = []

        async def on_progress(progress):
            progress_list.append(progress.model_dump())
            yield_data = json.dumps(progress.model_dump(), default=str)
            yield yield_data

        try:
            report = await dag.run(data_dir=data_dir)
            _last_report = report

            report_path = save_report(report)

            final = {
                "type": "complete",
                "match_rate": report.match_rate,
                "total_matches": report.matched_count,
                "total_exceptions": report.exception_count,
                "total_rejected": report.rejected_count,
                "duration_ms": report.pipeline_duration_ms,
                "report_path": report_path,
                "audit_hash": report.audit_hash,
            }
            yield json.dumps(final, default=str)

        except Exception as e:
            yield json.dumps({"type": "error", "error": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/reconciliation-report")
async def get_report():
    """Get the latest reconciliation report."""
    if _last_report:
        return _last_report.model_dump()
    return {"error": "No report available. Run reconciliation first."}


@app.get("/api/matches")
async def get_matches():
    """Get all verified matches with feature attribution."""
    if not _last_report:
        return []
    return [m.model_dump() for m in _last_report.matches]


@app.get("/api/exceptions")
async def get_exceptions():
    """Get all exceptions with AI hypotheses."""
    if not _last_report:
        return []
    return [e.model_dump() for e in _last_report.exceptions]


@app.get("/api/debates")
async def get_debates():
    """Get all debate results."""
    if not _last_report:
        return []
    return [d.model_dump() for d in _last_report.debates]



@app.post("/api/exceptions/{exception_id}/resolve")
async def resolve_exception(exception_id: str, req: ResolveExceptionRequest):
    """HITL resolution — human corrects an exception and the system learns."""
    hitl = HITLMemory()

    if _last_report:
        exc = next((e for e in _last_report.exceptions if e.exception_id == exception_id), None)
        context = exc.model_dump() if exc else {}
    else:
        context = {}

    entry_id = hitl.record_resolution(
        exception_id=exception_id,
        exception_code=context.get("exception_code", "UNKNOWN"),
        record_context=context,
        human_resolution=req.resolution_text,
        human_action=req.action,
    )

    return ResolveExceptionResponse(
        success=True,
        hitl_entry_id=entry_id,
        message=f"Resolution recorded. System learned from this correction.",
    )



@app.get("/api/trace/{record_id}")
async def get_trace(record_id: str):
    """Get the full OTel trace for a record."""
    traces = get_trace_timeline()
    matching = [t for t in traces if t.get("record_id") == record_id]
    return {"record_id": record_id, "traces": matching}


@app.get("/api/observability/traces")
async def get_all_traces():
    """Get recent OTel traces."""
    return get_trace_timeline()


@app.get("/api/observability/phase-timings")
async def get_phase_timings_endpoint():
    """Get per-phase timing statistics."""
    return get_phase_timings()



@app.post("/api/qa", response_model=QAResponse)
async def qa_endpoint(req: QARequest):
    """Natural language Q&A over reconciliation data."""
    return await answer_question(req.question, db, firewall)


@app.get("/api/sql-audit")
async def get_sql_audit():
    """Get SQL firewall audit log."""
    return firewall.get_audit_log()



@app.post("/api/mcp/query")
async def mcp_query(tool_name: str, arguments: dict = {}):
    """Execute an MCP tool call."""
    return await mcp.handle_tool_call(tool_name, arguments)


@app.get("/api/mcp/tools")
async def mcp_tools():
    """List available MCP tools."""
    from .mcp_server import MCP_TOOLS
    return MCP_TOOLS


@app.get("/api/mcp/events")
async def mcp_events():
    """Get MCP event history."""
    return mcp.get_events()



@app.get("/api/forecast")
async def forecast_endpoint(days: int = 7):
    """Cash position forecast."""
    return await forecast_cash_position(db, days)



@app.get("/api/batch-profile")
async def batch_profile():
    """Get dynamic tolerance configuration."""
    if _last_report:
        return _last_report.batch_profile.model_dump()
    return {"error": "No profile available. Generate data first."}



@app.get("/api/metrics", response_model=MetricsResponse)
async def metrics():
    """Comprehensive pipeline metrics."""
    match_count = await get_match_count(db)
    exception_count = await get_exception_count(db)
    rejection_count = await get_rejection_count(db)
    total = match_count + exception_count + rejection_count

    hitl = HITLMemory()
    timings = get_phase_timings()

    exc_breakdown = {}
    if _last_report:
        for e in _last_report.exceptions:
            code = e.exception_code.value
            exc_breakdown[code] = exc_breakdown.get(code, 0) + 1

    debate_stats = {"total": 0, "accepted": 0, "rejected": 0}
    if _last_report:
        for d in _last_report.debates:
            debate_stats["total"] += 1
            if d.verdict == "MATCH":
                debate_stats["accepted"] += 1
            else:
                debate_stats["rejected"] += 1

    return MetricsResponse(
        match_rate=_last_report.match_rate if _last_report else 0,
        total_matches=match_count,
        total_exceptions=exception_count,
        total_rejected=rejection_count,
        throughput_rps=_last_report.throughput_records_per_sec if _last_report else 0,
        phase_timings=timings,
        exception_breakdown=exc_breakdown,
        debate_stats=debate_stats,
        hitl_memory_size=hitl.size,
        llm_cache_hits=0,
        llm_cache_misses=0,
    )


@app.get("/api/health", response_model=HealthResponse)
async def health():
    """Health check with phase timing info."""
    return HealthResponse(
        status="healthy",
        phases=get_phase_timings(),
        uptime_seconds=round(time.time() - start_time, 2),
        memory_mb=0,
    )


@app.get("/api/memory/stats")
async def memory_stats():
    """HITL memory and LLM cache stats."""
    hitl = HITLMemory()
    return {
        "hitl_size": hitl.size,
        "hitl_entries": hitl.entries[-5:] if hitl.entries else [],
    }



@app.get("/api/adversarial/results")
async def adversarial_results():
    """Compare adversarial dataset results against ground truth."""
    gt_path = Path("data/ground_truth.json")
    if not gt_path.exists():
        return {"error": "No ground truth available. Generate adversarial data first."}

    ground_truth = json.loads(gt_path.read_text())

    results = []
    if _last_report:
        for gt in ground_truth:
            tag = gt.get("tag", "")
            expected_code = gt.get("correct_exception_code")
            found = False

            for exc in _last_report.exceptions:
                if expected_code and exc.exception_code.value == expected_code:
                    found = True
                    break

            results.append({
                "tag": tag,
                "expected_code": expected_code,
                "found": found,
                "status": "PASS" if found or expected_code is None else "CHECK",
            })

    return {"ground_truth": ground_truth, "results": results}



@app.websocket("/ws/pipeline")
async def pipeline_ws(websocket: WebSocket):
    """WebSocket for real-time pipeline progress."""
    await websocket.accept()

    dag = ReconciliationDAG(db)

    async def on_progress(progress):
        await websocket.send_json(progress.model_dump())

    dag.on_progress(on_progress)

    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "start":
                report = await dag.run()
                await websocket.send_json({"type": "complete", "match_rate": report.match_rate})
    except WebSocketDisconnect:
        pass



@app.websocket("/ws/mcp-terminal")
async def mcp_terminal_ws(websocket: WebSocket):
    """WebSocket for live MCP tool call streaming."""
    await websocket.accept()

    async def on_mcp_event(event: dict):
        try:
            await websocket.send_json(event)
        except Exception:
            pass

    mcp.register_event_callback(on_mcp_event)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
