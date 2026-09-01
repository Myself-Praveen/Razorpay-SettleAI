"use client";
import { useState, useEffect } from "react";
import { getReport, getTraces } from "@/lib/api";

export default function AuditPage() {
  const [report, setReport] = useState<any>(null);
  const [traces, setTraces] = useState<any[]>([]);

  useEffect(() => {
    getReport().then(setReport).catch(() => {});
    getTraces().then(setTraces).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Audit Report</h1>
      <p className="text-gray-400 mb-8">
        Machine-readable reconciliation report with SHA-256 audit hash
      </p>

      {report && !report.error ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Report: {report.report_id}</h2>
            <a
              href={`/api/reconciliation-report`}
              download
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium border border-gray-700"
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
              <div key={item.label} className="text-center bg-gray-900 p-4 rounded-lg border border-gray-800">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
            <p className="text-xs text-gray-500">Audit Hash: <span className="font-mono text-gray-300">{report.audit_hash}</span></p>
          </div>

          {report.batch_profile && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
              <h3 className="font-medium mb-3">Dynamic Tolerance Config</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Profile</p>
                  <p>{report.batch_profile.profile_type || report.batch_profile}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Amount Tolerance</p>
                  <p>Rs.{report.batch_profile.tolerance_config?.amount_tolerance || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Confidence Threshold</p>
                  <p>{report.batch_profile.tolerance_config?.confidence_threshold || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Date Tolerance</p>
                  <p>{report.batch_profile.tolerance_config?.date_tolerance_days || "N/A"}d</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="font-medium mb-3">OpenTelemetry Trace Timeline</h3>
            <div className="space-y-2">
              {traces.map((trace, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-32 font-mono text-xs text-gray-400">{trace.phase}</span>
                  <span className={`w-8 text-xs ${trace.status === "OK" ? "text-green-400" : "text-red-400"}`}>
                    {trace.status}
                  </span>
                  <span className="text-xs text-gray-500">{trace.duration_ms?.toFixed(1)}ms</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center text-gray-500">
          {report?.error || "No report available. Run reconciliation first."}
        </div>
      )}
    </div>
  );
}
