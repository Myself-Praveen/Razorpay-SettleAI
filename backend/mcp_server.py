"""
SettleAI — MCP Server.

Exposes reconciliation tools via the Model Context Protocol for
integration with external AI workspaces.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from .database import AsyncSQLiteWriter
from .models import ReconciliationReport


MCP_TOOLS = [
    {
        "name": "reconcile_batch",
        "description": "Run full reconciliation on a batch of financial records",
        "inputSchema": {
            "type": "object",
            "properties": {
                "data_dir": {"type": "string", "description": "Directory containing data files"},
            },
            "required": ["data_dir"],
        },
    },
    {
        "name": "query_match",
        "description": "Look up the reconciliation status of a specific transaction",
        "inputSchema": {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Transaction ID to look up"},
            },
            "required": ["transaction_id"],
        },
    },
    {
        "name": "explain_exception",
        "description": "Get the AI-generated root cause hypothesis for an exception",
        "inputSchema": {
            "type": "object",
            "properties": {
                "exception_id": {"type": "string", "description": "Exception ID to explain"},
            },
            "required": ["exception_id"],
        },
    },
    {
        "name": "forecast_cash",
        "description": "Project forward cash position based on reconciled data",
        "inputSchema": {
            "type": "object",
            "properties": {
                "days_ahead": {"type": "integer", "description": "Days to forecast (1-30)"},
            },
            "required": ["days_ahead"],
        },
    },
    {
        "name": "get_trace",
        "description": "Retrieve the full OpenTelemetry trace for a record's journey",
        "inputSchema": {
            "type": "object",
            "properties": {
                "record_id": {"type": "string", "description": "Record ID to trace"},
            },
            "required": ["record_id"],
        },
    },
]


class MCPServer:
    """SettleAI MCP Server with event streaming."""

    def __init__(self, db: AsyncSQLiteWriter):
        self.db = db
        self._event_callbacks: list = []
        self._events: list[dict] = []

    def register_event_callback(self, callback):
        self._event_callbacks.append(callback)

    async def handle_tool_call(self, tool_name: str, arguments: dict) -> dict:
        """Handle an MCP tool call."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": "tool_call",
            "tool": tool_name,
            "input": arguments,
        }
        self._events.append(event)
        await self._emit_event(event)

        try:
            result = await self._execute_tool(tool_name, arguments)
            result_event = {
                "timestamp": datetime.utcnow().isoformat(),
                "type": "tool_result",
                "tool": tool_name,
                "output": result,
            }
            self._events.append(result_event)
            await self._emit_event(result_event)
            return result
        except Exception as e:
            error_event = {
                "timestamp": datetime.utcnow().isoformat(),
                "type": "error",
                "tool": tool_name,
                "error": str(e),
            }
            self._events.append(error_event)
            await self._emit_event(error_event)
            return {"error": str(e)}

    async def _execute_tool(self, tool_name: str, args: dict) -> dict:
        if tool_name == "reconcile_batch":
            return {"status": "started", "data_dir": args.get("data_dir")}

        elif tool_name == "query_match":
            tid = args["transaction_id"]
            async with self.db.read() as conn:
                row = conn.execute(
                    "SELECT * FROM matches WHERE record_a_id = ? OR record_b_id = ?",
                    (tid, tid),
                ).fetchone()
            if row:
                return dict(row)
            return {"status": "not_found", "transaction_id": tid}

        elif tool_name == "explain_exception":
            eid = args["exception_id"]
            async with self.db.read() as conn:
                row = conn.execute(
                    "SELECT * FROM exceptions WHERE exception_id = ?", (eid,)
                ).fetchone()
            if row:
                return dict(row)
            return {"status": "not_found", "exception_id": eid}

        elif tool_name == "forecast_cash":
            from .forecast import forecast_cash_position
            forecast = await forecast_cash_position(self.db, args.get("days_ahead", 7))
            return forecast.model_dump()

        elif tool_name == "get_trace":
            from .otel import get_trace_timeline
            traces = get_trace_timeline()
            rid = args["record_id"]
            matching = [t for t in traces if t.get("record_id") == rid]
            return {"record_id": rid, "traces": matching}

        return {"error": f"Unknown tool: {tool_name}"}

    async def _emit_event(self, event: dict):
        for cb in self._event_callbacks:
            try:
                await cb(event)
            except Exception:
                pass

    def get_events(self) -> list[dict]:
        return list(self._events)
