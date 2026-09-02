"""
SettleAI — SQLite database with WAL mode and single-writer pattern.

All writes go through an asyncio.Queue processed by a single background task,
preventing WAL lock contention. Reads use separate connections (WAL allows
concurrent readers).
"""

from __future__ import annotations

import asyncio
import json
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from .models import (
    CheckpointData, ExceptionRecord, ExceptionCode, DebateResult,
    PipelinePhase, VerifiedMatch, VerificationRejection,
)

DB_PATH = Path("data/settleai.db")


SCHEMA_SQL = """
-- Normalized records from all sources
CREATE TABLE IF NOT EXISTS normalized_records (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    amount TEXT NOT NULL,
    type TEXT NOT NULL,
    debit TEXT DEFAULT '0',
    credit TEXT DEFAULT '0',
    fee TEXT DEFAULT '0',
    tax TEXT DEFAULT '0',
    settlement_id TEXT,
    order_id TEXT,
    payment_id TEXT,
    settled_at TEXT,
    method TEXT,
    card_network TEXT,
    currency TEXT DEFAULT 'INR',
    description TEXT,
    bank_utr TEXT,
    narration TEXT,
    is_adversarial INTEGER DEFAULT 0,
    adversarial_tag TEXT
);

-- Matches proposed and verified
CREATE TABLE IF NOT EXISTS matches (
    match_id TEXT PRIMARY KEY,
    record_a_id TEXT NOT NULL,
    record_b_id TEXT NOT NULL,
    match_status TEXT NOT NULL,
    confidence REAL NOT NULL,
    feature_attribution_json TEXT,
    verification_proof TEXT,
    audit_hash TEXT,
    phase TEXT,
    settlement_batch TEXT,
    proposed_at TEXT,
    verified INTEGER DEFAULT 0
);

-- Exceptions from Phase 4
CREATE TABLE IF NOT EXISTS exceptions (
    exception_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    exception_code TEXT NOT NULL,
    hypothesis TEXT,
    suggested_resolution TEXT,
    confidence_level TEXT,
    llm_raw_response TEXT,
    classified_at TEXT
);

-- Verification rejections from Phase 5
CREATE TABLE IF NOT EXISTS rejections (
    match_id TEXT PRIMARY KEY,
    record_a_id TEXT NOT NULL,
    record_b_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    detail TEXT,
    rejected_at TEXT
);

-- Debate results for borderline cases
CREATE TABLE IF NOT EXISTS debates (
    match_id TEXT PRIMARY KEY,
    record_a_id TEXT NOT NULL,
    record_b_id TEXT NOT NULL,
    initial_confidence REAL,
    verdict TEXT,
    adjusted_confidence REAL,
    merchant_argument TEXT,
    auditor_argument TEXT,
    synthesis_reasoning TEXT,
    debated_at TEXT
);

-- Pipeline checkpoints for crash recovery
CREATE TABLE IF NOT EXISTS pipeline_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL,
    state_json TEXT,
    created_at TEXT,
    record_count INTEGER DEFAULT 0
);

-- LLM response cache for idempotent replay
CREATE TABLE IF NOT EXISTS llm_cache (
    prompt_hash TEXT,
    model TEXT,
    response TEXT,
    created_at TEXT,
    PRIMARY KEY (prompt_hash, model)
);

-- HITL memory: human corrections
CREATE TABLE IF NOT EXISTS hitl_memory (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    exception_id TEXT,
    exception_code TEXT,
    context_json TEXT,
    human_resolution TEXT,
    human_action TEXT
);

-- SQL audit log for zero-trust execution
CREATE TABLE IF NOT EXISTS sql_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT,
    allowed INTEGER,
    reason TEXT,
    timestamp TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_record_a ON matches(record_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_record_b ON matches(record_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(match_status);
CREATE INDEX IF NOT EXISTS idx_exceptions_code ON exceptions(exception_code);
CREATE INDEX IF NOT EXISTS idx_exceptions_record ON exceptions(record_id);
CREATE INDEX IF NOT EXISTS idx_normalized_settlement ON normalized_records(settlement_id);
CREATE INDEX IF NOT EXISTS idx_normalized_order ON normalized_records(order_id);
CREATE INDEX IF NOT EXISTS idx_normalized_payment ON normalized_records(payment_id);
CREATE INDEX IF NOT EXISTS idx_normalized_source ON normalized_records(source);
"""


class AsyncSQLiteWriter:
    """
    Single-writer pattern for SQLite WAL mode.

    All write operations are queued and executed by a single background task,
    preventing WAL lock contention. Reads use separate connections (WAL allows
    unlimited concurrent readers).
    """

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._write_queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._writer_task: Optional[asyncio.Task] = None
        self._write_count = 0

    async def initialize(self):
        """Create schema and start the background writer."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path))
        conn.executescript(SCHEMA_SQL)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.commit()
        conn.close()
        await self.start_writer()

    async def start_writer(self):
        """Start the background writer task."""
        if self._running:
            return
        self._running = True
        self._writer_task = asyncio.create_task(self._writer_loop())

    async def stop_writer(self):
        """Stop the background writer."""
        self._running = False
        if self._writer_task:
            self._writer_task.cancel()
            try:
                await self._writer_task
            except asyncio.CancelledError:
                pass

    async def _writer_loop(self):
        """Single background task that processes all writes sequentially.
        
        Uses individual executes for reliability. All writes go through
        a single connection, so WAL mode handles concurrency safely.
        """
        conn = sqlite3.connect(str(self.db_path))
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-64000")  # 64MB cache

        while self._running:
            try:
                items: list[tuple[str, tuple]] = []
                try:
                    item = await asyncio.wait_for(
                        self._write_queue.get(), timeout=0.05
                    )
                    items.append(item)
                    while len(items) < 1000 and not self._write_queue.empty():
                        try:
                            items.append(self._write_queue.get_nowait())
                        except asyncio.QueueEmpty:
                            break
                except asyncio.TimeoutError:
                    pass

                if items:
                    try:
                        for sql, params in items:
                            conn.execute(sql, params)
                        conn.commit()
                        self._write_count += len(items)
                    except Exception as e:
                        conn.rollback()
                        print(f"DB write error: {e}")

            except asyncio.CancelledError:
                conn.close()
                raise
            except Exception as e:
                print(f"Writer loop error: {e}")
                conn.close()
                conn = sqlite3.connect(str(self.db_path))
                conn.execute("PRAGMA journal_mode=WAL")

    async def write(self, sql: str, params: tuple = ()):
        """Queue a single write operation — non-blocking."""
        await self._write_queue.put((sql, params))

    async def write_many(self, sql: str, params_list: list[tuple]):
        """Queue a batch write — non-blocking."""
        for params in params_list:
            await self._write_queue.put((sql, params))

    async def flush(self):
        """Wait for all pending writes to complete."""
        while not self._write_queue.empty():
            await asyncio.sleep(0.05)

    @asynccontextmanager
    async def read(self):
        """Get a read-only connection — concurrent reads are safe in WAL."""
        conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def sync_read(self) -> sqlite3.Connection:
        """Synchronous read for use in non-async contexts."""
        conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    @property
    def write_count(self) -> int:
        return self._write_count



async def save_checkpoint(db: AsyncSQLiteWriter, phase: PipelinePhase, state: dict):
    """Save a pipeline checkpoint for crash recovery."""
    await db.write(
        "INSERT INTO pipeline_state (phase, state_json, created_at, record_count) "
        "VALUES (?, ?, datetime('now'), ?)",
        (phase.value, json.dumps(state, default=str), state.get("record_count", 0)),
    )


async def get_last_checkpoint(db: AsyncSQLiteWriter) -> Optional[CheckpointData]:
    """Retrieve the last valid checkpoint."""
    async with db.read() as conn:
        row = conn.execute(
            "SELECT phase, state_json, created_at, record_count "
            "FROM pipeline_state ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if row:
            return CheckpointData(
                phase=PipelinePhase(row[0]),
                records_processed=row[3] or 0,
                matches_found=0,
                exceptions_found=0,
                state_json=row[1] or "{}",
            )
    return None



async def get_all_matches(db: AsyncSQLiteWriter) -> list[dict]:
    async with db.read() as conn:
        rows = conn.execute("SELECT * FROM matches WHERE verified = 1").fetchall()
        return [dict(r) for r in rows]


async def get_all_exceptions(db: AsyncSQLiteWriter) -> list[dict]:
    async with db.read() as conn:
        rows = conn.execute("SELECT * FROM exceptions").fetchall()
        return [dict(r) for r in rows]


async def get_match_count(db: AsyncSQLiteWriter) -> int:
    async with db.read() as conn:
        row = conn.execute("SELECT COUNT(*) FROM matches WHERE verified = 1").fetchone()
        return row[0] if row else 0


async def get_exception_count(db: AsyncSQLiteWriter) -> int:
    async with db.read() as conn:
        row = conn.execute("SELECT COUNT(*) FROM exceptions").fetchone()
        return row[0] if row else 0


async def get_rejection_count(db: AsyncSQLiteWriter) -> int:
    async with db.read() as conn:
        row = conn.execute("SELECT COUNT(*) FROM rejections").fetchone()
        return row[0] if row else 0


async def record_exists(db: AsyncSQLiteWriter, table: str, record_id: str) -> bool:
    async with db.read() as conn:
        row = conn.execute(
            f"SELECT 1 FROM {table} WHERE id = ?", (record_id,)
        ).fetchone()
        return row is not None
