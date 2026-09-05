"use client";
import { useState, useEffect } from "react";
import { getReport, getTraces } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuditPage() {
  const [report, setReport] = useState<any>(null);
  const [traces, setTraces] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getReport(), getTraces()])
      .then(([reportData, tracesData]) => {
        setReport(reportData);
        setTraces(tracesData || []);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load audit report. Is the backend running?");
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">Audit Report</h1>
      <p className="text-primary bg-primary/10 px-3 py-1 font-medium inline-block mb-10 rounded-full text-sm border border-primary/20">
        Machine-readable reconciliation report with SHA-256 audit hash
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      ) : report && !report.error ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground tracking-wide">Report: <span className="font-mono bg-muted border border-border px-2 py-1 rounded text-muted-foreground ml-2">{report.report_id}</span></h2>
            <a
              href={`/api/reconciliation-report`}
              download
              className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent shadow-sm hover:shadow-md rounded-lg text-sm font-semibold transition-all"
            >
              Download JSON
            </a>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Records", value: report.total_records },
              { label: "Matched", value: report.matched_count },
              { label: "Exceptions", value: report.exception_count },
              { label: "Rejected", value: report.rejected_count },
              {
                label: "Match Rate",
                value: `${(report.match_rate * 100).toFixed(1)}%`,
              },
            ].map((item) => (
              <div key={item.label} className="text-center bg-white p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-2">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm mb-8">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center">Audit Hash: <span className="font-mono text-foreground bg-white border border-border px-2 py-1 rounded ml-3">{report.audit_hash}</span></p>
          </div>

          {report.batch_profile && (
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 border-b border-l border-border bg-muted/30 px-3 py-1 font-semibold text-xs uppercase tracking-widest text-muted-foreground rounded-bl-lg">Config</div>
              <h3 className="font-semibold text-foreground mb-6 tracking-wide">Dynamic Tolerance Config</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="border-t border-border pt-4">
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mb-1">Profile</p>
                  <p className="text-lg font-medium text-foreground">{report.batch_profile.profile_type || report.batch_profile}</p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mb-1">Amount Tolerance</p>
                  <p className="text-lg font-medium text-foreground">Rs.{report.batch_profile.tolerance_config?.amount_tolerance || "N/A"}</p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mb-1">Confidence Threshold</p>
                  <p className="text-lg font-medium text-foreground">{report.batch_profile.tolerance_config?.confidence_threshold || "N/A"}</p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mb-1">Date Tolerance</p>
                  <p className="text-lg font-medium text-foreground">{report.batch_profile.tolerance_config?.date_tolerance_days || "N/A"}d</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
            <h3 className="font-semibold tracking-wide text-foreground mb-5">OpenTelemetry Trace Timeline</h3>
            <div className="space-y-3">
              {traces.map((trace, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border-b border-dashed border-border pb-3">
                  <span className="w-32 font-mono font-medium text-xs bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-muted-foreground">{trace.phase}</span>
                  <span className={`w-16 text-[11px] font-semibold uppercase text-center rounded-md border px-1 py-0.5 ${trace.status === "OK" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {trace.status}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground ml-auto">{trace.duration_ms?.toFixed(1)}ms</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-border text-center shadow-sm text-muted-foreground font-medium uppercase tracking-wider mt-10">
          {report?.error || "No report available. Run reconciliation first."}
        </div>
      )}
    </div>
  );
}
