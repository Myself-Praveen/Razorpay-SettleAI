"use client";
import { useState } from "react";
import { reconcile, generateData } from "@/lib/api";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const PHASES = [
  { name: "Normalize", desc: "Streaming O(1) via ijson" },
  { name: "Exact Match", desc: "O(N log N) sort + two-pointer" },
  { name: "Fuzzy Match", desc: "Feature attribution + Ollama" },
  { name: "Classify", desc: "GPT-4o-mini + HITL" },
  { name: "Verify", desc: "Double-entry gate (Decimal)" },
];

export default function PipelinePage() {
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [done, setDone] = useState<any>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateData(200, true);
      toast.success(`Generated ${res.total_records} test records!`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate data. Backend running?");
    }
    setGenerating(false);
  };

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
      toast.error("Pipeline failed to start. Is the backend running?");
    }
    setRunning(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">Reconciliation Pipeline</h1>
      <p className="text-primary bg-primary/10 px-3 py-1 font-medium inline-block mb-10 rounded-full text-sm border border-primary/20">
        Concurrent DAG with 5 phases and crash recovery checkpoints
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <button
          onClick={start}
          disabled={running || generating}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm hover:shadow-md font-semibold disabled:opacity-50 transition-all tracking-wide"
        >
          {running ? "Running..." : "Start Pipeline"}
        </button>
        <button
          onClick={handleGenerate}
          disabled={running || generating}
          className="px-6 py-2.5 bg-white hover:bg-gray-50 text-foreground rounded-lg border border-border shadow-sm hover:shadow-md font-semibold disabled:opacity-50 transition-all tracking-wide"
        >
          {generating ? "Generating..." : "Generate Test Data"}
        </button>
      </div>

      <div className="space-y-5">
        {PHASES.map((phase) => (
          <div key={phase.name} className="bg-white rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-foreground text-sm tracking-wide">Phase {PHASES.indexOf(phase) + 1}: {phase.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{phase.desc}</p>
              </div>
              <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                {progress[phase.name] !== undefined
                  ? `${progress[phase.name]}%`
                  : running ? "0%" : "--"}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-primary transition-all duration-500 absolute top-0 left-0 rounded-full"
                style={{
                  width: `${progress[phase.name] || 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {done && (
        <div className="mt-10 p-8 bg-white rounded-2xl border border-border shadow-md flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 w-full">
            <p className="font-medium text-green-700 bg-green-50 inline-block px-3 py-1.5 rounded-full border border-green-200 mb-6 text-sm">
              Complete! Match rate: {(done.match_rate * 100).toFixed(1)}% | Duration: {done.duration_ms?.toFixed(0)}ms
            </p>
            <div className="flex flex-col justify-center space-y-4">
              <div className="border border-border rounded-xl pl-5 py-4 bg-green-50/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-400"></div>
                <p className="text-muted-foreground font-semibold tracking-wide text-xs mb-1">Total Matches</p>
                <p className="text-3xl font-bold text-foreground">{done.total_matches}</p>
              </div>
              <div className="border border-border rounded-xl pl-5 py-4 bg-yellow-50/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400"></div>
                <p className="text-muted-foreground font-semibold tracking-wide text-xs mb-1">Total Exceptions</p>
                <p className="text-3xl font-bold text-foreground">{done.total_exceptions}</p>
              </div>
              <div className="border border-border rounded-xl pl-5 py-4 bg-red-50/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                <p className="text-muted-foreground font-semibold tracking-wide text-xs mb-1">Total Rejected</p>
                <p className="text-3xl font-bold text-foreground">{done.total_rejected}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Matches', value: done.total_matches },
                    { name: 'Exceptions', value: done.total_exceptions },
                    { name: 'Rejected', value: done.total_rejected }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#000"
                  strokeWidth={2}
                >
                  <Cell fill="#4ade80" />
                  <Cell fill="#facc15" />
                  <Cell fill="#f87171" />
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: '600' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontWeight: '600', fontSize: '0.875rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
