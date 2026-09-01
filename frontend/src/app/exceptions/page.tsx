"use client";
import { useState, useEffect } from "react";
import { getExceptions, resolveException } from "@/lib/api";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    getExceptions().then(setExceptions).catch(() => {});
  }, []);

  const handleResolve = async (action: string) => {
    if (!selected) return;
    try {
      await resolveException(selected.exception_id, action, `${action} by user`);
      setResolved((prev) => new Set([...prev, selected.exception_id]));
      setSelected(null);
      setExceptions((prev) => prev.filter((e) => e.exception_id !== selected.exception_id));
    } catch (e) {
      console.error(e);
    }
  };

  const activeExceptions = exceptions.filter((e) => !resolved.has(e.exception_id));

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      <div className="w-96 overflow-auto space-y-3 pr-2">
        <h1 className="text-3xl font-bold mb-1">Exception Explorer</h1>
        <p className="text-sm text-gray-400 mb-4">
          {activeExceptions.length} exceptions with AI hypotheses, feature attribution, and HITL learning
        </p>
        {activeExceptions.map((exc) => (
          <button
            key={exc.exception_id}
            onClick={() => setSelected(exc)}
            className={`w-full text-left p-4 rounded-lg border transition-colors ${
              selected?.exception_id === exc.exception_id
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-gray-800 bg-gray-900 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-indigo-400 truncate max-w-[200px]">
                {exc.exception_id}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                  exc.confidence_level === "high"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {exc.confidence_level}
              </span>
            </div>
            <p className="text-xs font-semibold text-yellow-400">{exc.exception_code}</p>
            <p className="text-xs text-gray-400 mt-0.5">{exc.hypothesis}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-6 overflow-auto">
        {selected ? (
          <>
            <h2 className="text-xl font-bold mb-4">Exception Detail</h2>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">Source Data (Record {selected.record_id})</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Record ID</span>
                    <span className="font-mono text-gray-300">{selected.record_id}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700/50 pt-2">
                    <span className="text-gray-500">Exception Code</span>
                    <span className="font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">{selected.exception_code}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-gray-500 mb-1">Raw Analysis Data</p>
                    <pre className="bg-black/50 p-2 rounded text-green-400 overflow-x-auto">
                      {JSON.stringify(selected, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-indigo-900/10 rounded-lg p-4 border border-indigo-500/20">
                <h3 className="text-sm font-semibold text-indigo-300 mb-3 border-b border-indigo-500/20 pb-2">AI Auditor Hypothesis</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Detected Discrepancy</p>
                    <p className="text-gray-200 bg-red-500/10 border border-red-500/20 p-2 rounded">{selected.hypothesis}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Suggested Resolution</p>
                    <p className="text-green-400 bg-green-500/10 border border-green-500/20 p-2 rounded">{selected.suggested_resolution}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-indigo-500/20">
                  <p className="text-xs text-indigo-300 mb-3">Human-In-The-Loop (HITL) Action:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve("accepted_as_is")}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded text-xs font-semibold shadow-lg shadow-green-900/20 transition-all"
                    >
                      Accept AI Hypothesis
                    </button>
                    <button
                      onClick={() => handleResolve("manual_override")}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded text-xs font-semibold shadow-lg shadow-red-900/20 transition-all"
                    >
                      Reject & Override
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 text-center">Actions update `few_shot_memory.json` to train future runs.</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Select an exception to view details
          </div>
        )}
      </div>
    </div>
  );
}
