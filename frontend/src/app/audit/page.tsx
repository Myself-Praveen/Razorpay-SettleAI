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
      <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-3">Audit Report</h1>
      <p className="text-black bg-accent px-2 py-1 font-bold inline-block mb-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        Machine-readable reconciliation report with SHA-256 audit hash
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      ) : report && !report.error ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-black uppercase tracking-wide">Report: <span className="font-mono bg-gray-100 border border-black px-1 ml-2">{report.report_id}</span></h2>
            <a
              href={`/api/reconciliation-report`}
              download
              className="px-6 py-2 bg-black text-white hover:bg-accent hover:text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] rounded-none text-sm font-bold uppercase tracking-wider transition-all"
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
              <div key={item.label} className="text-center bg-white p-4 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-accent transition-colors">
                <p className="text-2xl font-black text-black">{item.value}</p>
                <p className="text-xs text-black font-bold uppercase tracking-wider mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-none p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-8">
            <p className="text-xs text-black font-bold uppercase tracking-wide">Audit Hash: <span className="font-mono bg-white border border-black px-2 py-1 ml-2">{report.audit_hash}</span></p>
          </div>

          {report.batch_profile && (
            <div className="bg-white rounded-none p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 relative">
              <div className="absolute top-0 right-0 border-b-2 border-l-2 border-black bg-accent px-3 py-1 font-bold text-xs uppercase tracking-widest">Config</div>
              <h3 className="font-black uppercase text-black mb-6 tracking-wide">Dynamic Tolerance Config</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="border-t-2 border-black pt-3">
                  <p className="text-black font-bold uppercase tracking-wider text-xs mb-1">Profile</p>
                  <p className="text-lg font-medium text-black">{report.batch_profile.profile_type || report.batch_profile}</p>
                </div>
                <div className="border-t-2 border-black pt-3">
                  <p className="text-black font-bold uppercase tracking-wider text-xs mb-1">Amount Tolerance</p>
                  <p className="text-lg font-medium text-black">Rs.{report.batch_profile.tolerance_config?.amount_tolerance || "N/A"}</p>
                </div>
                <div className="border-t-2 border-black pt-3">
                  <p className="text-black font-bold uppercase tracking-wider text-xs mb-1">Confidence Threshold</p>
                  <p className="text-lg font-medium text-black">{report.batch_profile.tolerance_config?.confidence_threshold || "N/A"}</p>
                </div>
                <div className="border-t-2 border-black pt-3">
                  <p className="text-black font-bold uppercase tracking-wider text-xs mb-1">Date Tolerance</p>
                  <p className="text-lg font-medium text-black">{report.batch_profile.tolerance_config?.date_tolerance_days || "N/A"}d</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-none p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
            <h3 className="font-black uppercase tracking-wide text-black mb-5">OpenTelemetry Trace Timeline</h3>
            <div className="space-y-3">
              {traces.map((trace, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border-b-2 border-dashed border-gray-200 pb-2">
                  <span className="w-32 font-mono font-bold text-xs bg-gray-100 border border-black px-1 text-black">{trace.phase}</span>
                  <span className={`w-12 text-xs font-black uppercase text-center border-2 border-black px-1 ${trace.status === "OK" ? "bg-green-400 text-black" : "bg-red-500 text-white"}`}>
                    {trace.status}
                  </span>
                  <span className="text-xs font-medium text-black">{trace.duration_ms?.toFixed(1)}ms</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-none p-8 border-2 border-dashed border-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-bold uppercase tracking-wider">
          {report?.error || "No report available. Run reconciliation first."}
        </div>
      )}
    </div>
  );
}
