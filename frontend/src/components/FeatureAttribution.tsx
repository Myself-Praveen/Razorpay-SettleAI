"use client";

interface Feature {
  name: string;
  weight: number;
  raw_score: number;
  justification: string;
}

export default function FeatureAttribution({ features }: { features: Feature[] }) {
  const colorMap: Record<string, string> = {
    W_amount: "bg-blue-400",
    W_date: "bg-green-400",
    W_reference: "bg-accent",
    W_method: "bg-purple-400",
  };

  return (
    <div className="space-y-4">
      {features.map((f) => (
        <div key={f.name} className="border-b-2 border-dashed border-gray-200 pb-3 last:border-0 last:pb-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-black font-bold uppercase tracking-wider">{f.name} <span className="font-mono bg-gray-100 border border-black px-1 ml-1">{f.weight}</span></span>
            <span className="text-black font-black font-mono">{f.raw_score.toFixed(3)}</span>
          </div>
          <div className="w-full bg-gray-200 border border-black h-4 relative mt-2">
            <div
              className={`${colorMap[f.name] || "bg-gray-500"} h-full absolute left-0 top-0 border-r border-black transition-all`}
              style={{ width: `${f.raw_score * 100}%` }}
            />
          </div>
          <p className="text-xs text-black font-bold mt-2 bg-gray-100 border border-black p-1">{f.justification}</p>
        </div>
      ))}
    </div>
  );
}
