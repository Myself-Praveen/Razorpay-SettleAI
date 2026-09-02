"use client";

export default function ConfidenceBar({ confidence, threshold = 0.85 }: { confidence: number; threshold?: number }) {
  const pct = (confidence * 100).toFixed(1);
  const isAbove = confidence >= threshold;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 border border-black rounded-none h-4 relative">
        <div
          className={`h-full border-r border-black absolute top-0 left-0 transition-all ${
            isAbove ? "bg-green-400" : "bg-accent"
          }`}
          style={{ width: `${confidence * 100}%` }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold border-2 border-black px-1 text-center w-12 ${isAbove ? "bg-green-400 text-black" : "bg-accent text-black"}`}>
        {pct}%
      </span>
    </div>
  );
}
