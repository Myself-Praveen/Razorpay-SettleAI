"use client";

interface Feature {
  name: string;
  weight: number;
  raw_score: number;
  justification: string;
}

export default function FeatureAttribution({ features }: { features: Feature[] }) {
  const colorMap: Record<string, string> = {
    W_amount: "bg-blue-500",
    W_date: "bg-green-500",
    W_reference: "bg-yellow-500",
    W_method: "bg-purple-500",
  };

  return (
    <div className="space-y-2">
      {features.map((f) => (
        <div key={f.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">{f.name} ({f.weight})</span>
            <span className="text-gray-500">{f.raw_score.toFixed(3)}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className={`${colorMap[f.name] || "bg-gray-500"} h-3 rounded-full transition-all`}
              style={{ width: `${f.raw_score * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{f.justification}</p>
        </div>
      ))}
    </div>
  );
}
