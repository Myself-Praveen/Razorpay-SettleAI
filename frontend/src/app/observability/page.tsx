"use client";
import { useState, useEffect } from "react";
import { getTraces, getSqlAudit, getHealth } from "@/lib/api";

export default function ObservabilityPage() {
  const [traces, setTraces] = useState<any[]>([]);
  const [sqlAudit, setSqlAudit] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    getTraces().then(setTraces).catch(() => {});
    getSqlAudit().then(setSqlAudit).catch(() => {});
    getHealth().then(setHealth).catch(() => {});
  }, []);

  const blocked = sqlAudit.filter((e) => !e.allowed).length;
  const allowed = sqlAudit.filter((e) => e.allowed).length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Observability</h1>
      <p className="text-gray-400 mb-8">
        OpenTelemetry traces, Jaeger, LangChain instrumentation, and SQL audit
      </p>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-3">Jaeger Tracing</h2>
        <a
          href="http://localhost:16686"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 transition-colors"
        >
          Open Jaeger UI
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
            <path d="M11 1H5v1h5v5h1V1.707L6.243 8.464 5.536 7.757 10.293 3H9V2h2v-1z" />
          </svg>
        </a>
        <p className="text-xs text-gray-500 mt-2">Distributed traces across all pipeline phases</p>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-4">Phase Execution Timings</h2>
        <div className="space-y-3">
          {traces.map((trace, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-32 text-xs text-gray-400 font-mono">{trace.phase}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min((trace.duration_ms / 120) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-32 text-right">
                {trace.duration_ms?.toFixed(1)}ms (avg: {trace.duration_ms?.toFixed(1)}ms)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-3">SQL Firewall Audit Log</h2>
        <p className="text-sm text-gray-400 mb-4">
          Blocked: <span className="text-red-400 font-medium">{blocked}</span> | Allowed:{" "}
          <span className="text-green-400 font-medium">{allowed}</span>
        </p>
        <div className="space-y-2 max-h-64 overflow-auto">
          {sqlAudit.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono">
              <span className={entry.allowed ? "text-green-400" : "text-red-400"}>
                {entry.allowed ? "ALLOWED" : "BLOCKED"}
              </span>
              <span className="text-gray-500 w-44 shrink-0">{entry.timestamp}</span>
              <span className="text-gray-400 truncate">{entry.query}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="font-medium mb-3">LangChain Instrumentation</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Trace spans</span>
              <span className="font-medium">{traces.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">HITL memory entries</span>
              <span className="font-medium">{health?.hitl_entries || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="font-medium mb-3">System Health</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className={`font-medium ${health?.status === "healthy" ? "text-green-400" : "text-red-400"}`}>
                {health?.status || "unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime</span>
              <span className="font-medium">{health?.uptime_seconds?.toFixed(0) || 0}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
