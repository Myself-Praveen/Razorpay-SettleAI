"use client";
import { useState } from "react";
import { reconcile } from "@/lib/api";

const PHASES = [
  { name: "Normalize", desc: "Streaming O(1) via ijson" },
  { name: "Exact Match", desc: "O(N log N) sort + two-pointer" },
  { name: "Fuzzy Match", desc: "Feature attribution + Ollama" },
  { name: "Classify", desc: "GPT-4o-mini + HITL" },
  { name: "Verify", desc: "Double-entry gate (Decimal)" },
];

export default function PipelinePage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [done, setDone] = useState<any>(null);

  const start = async () => {
    setRunning(true);
    setProgress({});
    setDone(null);
    try {
      const events = await reconcile();
      const final = events.find((e: any) => e.type === "complete");
      if (final) setDone(final);
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Reconciliation Pipeline</h1>
      <p className="text-gray-400 mb-8">
        Concurrent DAG with 5 phases and crash recovery checkpoints
      </p>

      <button
        onClick={start}
        disabled={running}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50 mb-8"
      >
        {running ? "Running..." : "Start Pipeline"}
      </button>

      <div className="space-y-4">
        {PHASES.map((phase) => (
          <div key={phase.name} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">Phase {PHASES.indexOf(phase) + 1}: {phase.name}</p>
                <p className="text-xs text-gray-500">{phase.desc}</p>
              </div>
              <span className="text-sm text-gray-400">
                {progress[phase.name] !== undefined
                  ? `${progress[phase.name]}%`
                  : running ? "0%" : "--"}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${progress[phase.name] || 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {done && (
        <div className="mt-8 p-6 bg-gray-900 rounded-xl border border-gray-800">
          <p className="font-semibold text-green-400 mb-3">
            Complete! Match rate: {(done.match_rate * 100).toFixed(1)}% | Duration: {done.duration_ms?.toFixed(0)}ms
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Matches</p>
              <p className="text-xl font-bold text-indigo-400">{done.total_matches}</p>
            </div>
            <div>
              <p className="text-gray-500">Exceptions</p>
              <p className="text-xl font-bold text-yellow-400">{done.total_exceptions}</p>
            </div>
            <div>
              <p className="text-gray-500">Rejected</p>
              <p className="text-xl font-bold text-red-400">{done.total_rejected}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
