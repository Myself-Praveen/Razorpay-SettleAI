"use client";
import { useState, useEffect } from "react";
import { getTraces, getSqlAudit, getHealth } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ObservabilityPage() {
  const [traces, setTraces] = useState<any[]>([]);
  const [sqlAudit, setSqlAudit] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getTraces(), getSqlAudit(), getHealth()])
      .then(([tracesData, sqlData, healthData]) => {
        setTraces(tracesData || []);
        setSqlAudit(sqlData || []);
        setHealth(healthData);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load observability data. Is backend running?");
        setIsLoading(false);
      });
  }, []);

  const blocked = sqlAudit.filter((e) => !e.allowed).length;
  const allowed = sqlAudit.filter((e) => e.allowed).length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">Observability</h1>
      <p className="text-primary bg-primary/10 px-3 py-1 font-medium inline-block mb-10 rounded-full text-sm border border-primary/20">
        OpenTelemetry traces, Jaeger, LangChain instrumentation, and SQL audit
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-8 border border-border shadow-sm mb-8">
        <h2 className="text-lg font-semibold tracking-wide text-foreground mb-4">Jaeger Tracing</h2>
        <a
          href="http://localhost:16686"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-semibold"
        >
          Open Jaeger UI
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
            <path d="M11 1H5v1h5v5h1V1.707L6.243 8.464 5.536 7.757 10.293 3H9V2h2v-1z" />
          </svg>
        </a>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-5">Distributed traces across all pipeline phases</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-border shadow-sm mb-8">
        <h2 className="text-lg font-semibold tracking-wide text-foreground mb-6">Phase Execution Timings</h2>
        <div className="space-y-5">
          {traces.map((trace, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-32 text-xs text-muted-foreground font-mono font-medium bg-muted/50 border border-border/50 rounded-md px-1 text-center py-1">{trace.phase}</span>
              <div className="flex-1 h-2.5 bg-muted/40 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-primary absolute top-0 left-0 rounded-full"
                  style={{ width: `${Math.min((trace.duration_ms / 120) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-foreground font-semibold w-32 text-right">
                {trace.duration_ms?.toFixed(1)}ms (avg: {trace.duration_ms?.toFixed(1)}ms)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-border shadow-sm mb-8">
        <h2 className="text-lg font-semibold tracking-wide text-foreground mb-3">SQL Firewall Audit Log</h2>
        <p className="text-sm text-muted-foreground font-medium mb-6">
          Blocked: <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">{blocked}</span> | Allowed:{" "}
          <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{allowed}</span>
        </p>
        <div className="space-y-3 max-h-64 overflow-auto p-5 bg-muted/20 border border-border rounded-xl shadow-inner">
          {sqlAudit.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono border-b border-border/60 pb-3">
              <span className={`px-2 py-0.5 font-semibold rounded border ${entry.allowed ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {entry.allowed ? "ALLOWED" : "BLOCKED"}
              </span>
              <span className="text-muted-foreground w-44 shrink-0">{entry.timestamp}</span>
              <span className="text-foreground font-semibold truncate">{entry.query}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-border shadow-sm">
          <h3 className="font-semibold tracking-wide text-foreground mb-5">LangChain Instrumentation</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-border/60 pb-3">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Trace spans</span>
              <span className="font-semibold text-foreground">{traces.length}</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-3">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">HITL memory entries</span>
              <span className="font-semibold text-foreground">{health?.hitl_entries || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-border shadow-sm">
          <h3 className="font-semibold tracking-wide text-foreground mb-5">System Health</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-border/60 pb-3">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Status</span>
              <span className={`font-semibold uppercase rounded px-2 py-0.5 border text-xs ${health?.status === "healthy" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {health?.status || "unknown"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-3">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Uptime</span>
              <span className="font-semibold text-foreground">{health?.uptime_seconds?.toFixed(0) || 0}s</span>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
