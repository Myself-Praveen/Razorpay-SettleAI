"use client";

export default function ConfidenceBar({ confidence, threshold = 0.85 }: { confidence: number; threshold?: number }) {
  const pct = (confidence * 100).toFixed(1);
  const isAbove = confidence >= threshold;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-2 relative">
        <div
          className={`h-2 rounded-full transition-all ${
            isAbove ? "bg-green-500" : "bg-yellow-500"
          }`}
          style={{ width: `${confidence * 100}%` }}
        />
        <div
          className="absolute top-0 w-px h-2 bg-red-400"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${isAbove ? "text-green-400" : "text-yellow-400"}`}>
        {pct}%
      </span>
    </div>
  );
}
