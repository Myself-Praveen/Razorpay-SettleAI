"""
SettleAI — Report Generator.

Generates the machine-readable reconciliation_report.json output.
"""

from __future__ import annotations

import json
from pathlib import Path

from .models import ReconciliationReport


def save_report(report: ReconciliationReport, output_dir: str = "output") -> str:
    """Save the reconciliation report to JSON."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    report.audit_hash = report.compute_audit_hash()
    path = out / "reconciliation_report.json"
    path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    return str(path)


def load_report(path: str) -> ReconciliationReport:
    """Load a reconciliation report from JSON."""
    data = json.loads(Path(path).read_text())
    return ReconciliationReport.model_validate(data)
