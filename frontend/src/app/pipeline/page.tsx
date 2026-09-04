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
      <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-3">Reconciliation Pipeline</h1>
      <p className="text-black bg-accent px-2 py-1 font-bold inline-block mb-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        Concurrent DAG with 5 phases and crash recovery checkpoints
      </p>

      <div className="flex gap-4 mb-10">
        <button
          onClick={start}
          disabled={running || generating}
          className="px-6 py-3 bg-black hover:bg-accent hover:text-black text-white rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 font-bold disabled:opacity-50 transition-all uppercase tracking-widest"
        >
          {running ? "Running..." : "Start Pipeline"}
        </button>
        <button
          onClick={handleGenerate}
          disabled={running || generating}
          className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 font-bold disabled:opacity-50 transition-all uppercase tracking-widest"
        >
          {generating ? "Generating..." : "Generate Test Data"}
        </button>
      </div>

      <div className="space-y-5">
        {PHASES.map((phase) => (
          <div key={phase.name} className="bg-white rounded-none p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-black uppercase tracking-wide text-sm">Phase {PHASES.indexOf(phase) + 1}: {phase.name}</p>
                <p className="text-xs text-gray-600 font-medium mt-1">{phase.desc}</p>
              </div>
              <span className="text-sm font-mono font-bold text-black bg-gray-100 px-2 py-1 border border-black">
                {progress[phase.name] !== undefined
                  ? `${progress[phase.name]}%`
                  : running ? "0%" : "--"}
              </span>
            </div>
            <div className="h-3 bg-gray-200 border-2 border-black rounded-none overflow-hidden relative">
              <div
                className="h-full bg-accent border-r-2 border-black transition-all duration-500 absolute top-0 left-0"
                style={{
                  width: `${progress[phase.name] || 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {done && (
        <div className="mt-10 p-6 bg-white rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 w-full">
            <p className="font-bold text-black bg-green-400 inline-block px-2 py-1 border-2 border-black mb-5 uppercase tracking-wide text-sm">
              Complete! Match rate: {(done.match_rate * 100).toFixed(1)}% | Duration: {done.duration_ms?.toFixed(0)}ms
            </p>
            <div className="flex flex-col justify-center space-y-4">
              <div className="border-l-4 border-green-500 pl-4 py-2 bg-gray-50 border-y-2 border-r-2 border-y-black border-r-black">
                <p className="text-black font-bold uppercase tracking-wider text-xs">Total Matches</p>
                <p className="text-3xl font-black text-black">{done.total_matches}</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-gray-50 border-y-2 border-r-2 border-y-black border-r-black">
                <p className="text-black font-bold uppercase tracking-wider text-xs">Total Exceptions</p>
                <p className="text-3xl font-black text-black">{done.total_exceptions}</p>
              </div>
              <div className="border-l-4 border-red-500 pl-4 py-2 bg-gray-50 border-y-2 border-r-2 border-y-black border-r-black">
                <p className="text-black font-bold uppercase tracking-wider text-xs">Total Rejected</p>
                <p className="text-3xl font-black text-black">{done.total_rejected}</p>
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
                  contentStyle={{ borderRadius: '0px', border: '2px solid black', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'black' }}
                />
                <Legend iconType="square" wrapperStyle={{ fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
