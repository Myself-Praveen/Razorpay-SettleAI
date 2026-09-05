"use client";

export default function ConfidenceBar({ confidence, threshold = 0.85 }: { confidence: number; threshold?: number }) {
  const pct = (confidence * 100).toFixed(1);
  const isAbove = confidence >= threshold;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-muted/40 rounded-full h-2.5 relative overflow-hidden">
        <div
          className={`h-full absolute top-0 left-0 transition-all rounded-full ${
            isAbove ? "bg-green-500" : "bg-yellow-400"
          }`}
          style={{ width: `${confidence * 100}%` }}
        />
        <div
          className="absolute top-0 w-[2px] h-full bg-red-400/80 z-10 shadow-sm"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold rounded-md px-2 py-0.5 text-center w-14 ${isAbove ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
        {pct}%
      </span>
    </div>
  );
}
