"""
SettleAI — OpenTelemetry tracing with Jaeger export.

Provides distributed tracing across all pipeline phases with:
- OTLP export to Jaeger for infrastructure observability
- In-memory export for dashboard trace viewer
- LangChain auto-instrumentation for the Q&A agent
"""

from __future__ import annotations

import os
import time
from contextlib import contextmanager
from typing import Any, Optional

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.trace import Span, StatusCode

_tracer: Optional[trace.Tracer] = None
_provider: Optional[TracerProvider] = None
_spans_cache: list[dict] = []  # In-memory span cache for UI
_phase_timings: dict[str, list[float]] = {}


def setup(service_name: str = "settleai"):
    """Initialize OpenTelemetry with dual export (Jaeger + in-memory)."""
    global _tracer, _provider

    resource = Resource.create({SERVICE_NAME: service_name})
    _provider = TracerProvider(resource=resource)

    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        jaeger_endpoint = os.getenv("JAEGER_ENDPOINT", "http://localhost:4317")
        otlp_exporter = OTLPSpanExporter(endpoint=jaeger_endpoint)
        _provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    except (ImportError, Exception) as e:
        print(f"OTLP exporter not available ({e}), using in-memory only")

    trace.set_tracer_provider(_provider)
    _tracer = trace.get_tracer(service_name)


def get_tracer() -> trace.Tracer:
    """Get the global tracer instance."""
    global _tracer
    if _tracer is None:
        setup()
    return _tracer


@contextmanager
def traced_phase(phase_name: str, attributes: dict[str, Any] = None):
    """
    Context manager for tracing a pipeline phase.

    Automatically captures timing and stores span data for the UI.
    """
    tracer = get_tracer()
    attrs = attributes or {}

    with tracer.start_as_current_span(
        f"phase.{phase_name}",
        attributes={"phase.name": phase_name, **attrs},
    ) as span:
        start = time.monotonic()
        try:
            yield span
            span.set_status(StatusCode.OK)
        except Exception as e:
            span.set_status(StatusCode.ERROR, str(e))
            span.record_exception(e)
            raise
        finally:
            elapsed = (time.monotonic() - start) * 1000
            span.set_attribute("phase.duration_ms", elapsed)

            _spans_cache.append({
                "phase": phase_name,
                "start_ms": start * 1000,
                "duration_ms": elapsed,
                "status": span.status.status_code.name,
                "attributes": dict(span.attributes) if hasattr(span, 'attributes') else {},
            })

            if phase_name not in _phase_timings:
                _phase_timings[phase_name] = []
            _phase_timings[phase_name].append(elapsed)


@contextmanager
def traced_operation(name: str, attributes: dict[str, Any] = None):
    """Context manager for tracing a sub-operation within a phase."""
    tracer = get_tracer()
    attrs = attributes or {}

    with tracer.start_as_current_span(name, attributes=attrs) as span:
        start = time.monotonic()
        try:
            yield span
            span.set_status(StatusCode.OK)
        except Exception as e:
            span.set_status(StatusCode.ERROR, str(e))
            span.record_exception(e)
            raise
        finally:
            elapsed = (time.monotonic() - start) * 1000
            span.set_attribute("operation.duration_ms", elapsed)


def record_record_trace(
    record_id: str,
    trace_id: str,
    phase: str,
    status: str,
    attributes: dict[str, Any],
):
    """Record a per-record trace for the trace viewer."""
    _spans_cache.append({
        "record_id": record_id,
        "trace_id": trace_id,
        "phase": phase,
        "status": status,
        "attributes": attributes,
    })


def get_trace_timeline() -> list[dict]:
    """Get the span timeline for the UI trace viewer."""
    return list(_spans_cache)


def get_phase_timings() -> dict[str, dict]:
    """Get aggregated phase timing statistics."""
    result = {}
    for phase, timings in _phase_timings.items():
        result[phase] = {
            "count": len(timings),
            "avg_ms": sum(timings) / len(timings) if timings else 0,
            "min_ms": min(timings) if timings else 0,
            "max_ms": max(timings) if timings else 0,
            "total_ms": sum(timings),
        }
    return result


def clear_traces():
    """Clear the in-memory span cache (e.g., before a new run)."""
    _spans_cache.clear()
    _phase_timings.clear()


def install_langchain_instrumentation():
    """Auto-instrument LangChain for Q&A agent tracing."""
    try:
        from opentelemetry.instrumentation.openai import OpenAIInstrumentor
        OpenAIInstrumentor().instrument()
    except (ImportError, Exception) as e:
        print(f"LangChain/OpenAI instrumentation not available: {e}")
