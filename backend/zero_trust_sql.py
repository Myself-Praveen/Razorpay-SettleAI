"""
SettleAI — Zero-Trust SQL Execution.

Triple-layer defense for natural language to SQL execution:
1. Regex firewall — blocks dangerous keywords
2. Read-only SQLite replica (PRAGMA query_only=ON)
3. Query audit log for every attempt
"""

from __future__ import annotations

import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from .database import DB_PATH


BLOCKED_PATTERNS = [
    r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b",
    r"\bALTER\b", r"\bCREATE\b", r"\bTRUNCATE\b", r"\bREPLACE\b",
    r"\bGRANT\b", r"\bREVOKE\b", r"\bEXEC\b", r"\bEXECUTE\b",
    r"--", r"/\*", r"\bUNION\b.*\bSELECT\b",
    r";\s*\w", r"\bsqlite_master\b", r"\bsqlite_schema\b", r"\bpragma\b",
]

_blocked_regex = re.compile("|".join(BLOCKED_PATTERNS), re.IGNORECASE)


class SQLFirewall:
    """Triple-layer defense for SQL execution."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.audit_log: list[dict] = []

    def check_query(self, sql: str) -> tuple[bool, str]:
        """Check if a SQL query is safe. Returns (is_safe, reason)."""
        match = _blocked_regex.search(sql)
        if match:
            reason = f"BLOCKED: Dangerous keyword detected: '{match.group()}'"
            self._log_audit(sql, False, reason)
            return False, reason

        stripped = sql.strip().upper()
        if not stripped.startswith("SELECT"):
            reason = "BLOCKED: Only SELECT queries allowed"
            self._log_audit(sql, False, reason)
            return False, reason

        self._log_audit(sql, True, "ALLOWED")
        return True, "ALLOWED"

    def execute_safe(self, sql: str) -> tuple[bool, str]:
        """Execute a safe SQL query on a read-only connection."""
        is_safe, reason = self.check_query(sql)
        if not is_safe:
            return False, reason

        try:
            conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
            result = conn.execute(sql).fetchall()
            conn.close()

            rows = [dict(r) for r in result]
            return True, str(rows)
        except Exception as e:
            return False, f"Query error: {e}"

    def _log_audit(self, sql: str, allowed: bool, reason: str):
        self.audit_log.append({
            "query": sql,
            "allowed": allowed,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def get_audit_log(self) -> list[dict]:
        return list(self.audit_log)

    def get_blocked_count(self) -> int:
        return sum(1 for e in self.audit_log if not e["allowed"])
