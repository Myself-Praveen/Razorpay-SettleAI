"use client";

export default function MatchRateGauge({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(1);
  const color = rate >= 0.85 ? "text-green-400" : rate >= 0.70 ? "text-yellow-400" : "text-red-400";
  const bgColor = rate >= 0.85 ? "bg-green-500" : rate >= 0.70 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke="currentColor" strokeWidth="8"
            strokeDasharray={`${rate * 339} 339`}
            className={`${color} transition-all duration-1000`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-400 mt-2">Match Rate</p>
    </div>
  );
}
