"use client";
import { useState, useEffect } from "react";
import { getForecast } from "@/lib/api";

export default function ForecastPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getForecast(days).then(setData).catch(() => {});
  }, [days]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Cash Position Forecast</h1>
      <p className="text-gray-400 mb-8">
        {days}-day forward projection from reconciled settlement data
      </p>

      <div className="flex gap-2 mb-8">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {data && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              data.overall_confidence === "high"
                ? "bg-green-500"
                : data.overall_confidence === "medium"
                ? "bg-yellow-500"
                : "bg-red-500"
            }`} />
            <span className="text-sm text-gray-400">
              Overall confidence: {data.overall_confidence}
            </span>
          </div>

          <div className="space-y-2 mb-8">
            {data.days?.map((day: any) => (
              <div
                key={day.date}
                className="flex items-center gap-4 p-3 bg-gray-900 rounded-lg border border-gray-800"
              >
                <span className="text-xs text-gray-500 w-24 font-mono">{day.date}</span>
                <div className="flex-1">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        day.projected_flow < 0 ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          Math.abs(day.projected_flow) / 300000,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-40 text-right">
                  {day.projected_flow < 0 ? "-" : ""}Rs.{Math.abs(day.projected_flow).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-medium w-16 text-right ${
                  day.confidence === "high"
                    ? "text-green-400"
                    : day.confidence === "medium"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}>
                  {day.confidence}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-400">
                  Rs.{data.projected_position?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Projected Position ({days}d)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-300">
                  Rs.{data.tomorrows_flow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Tomorrow&apos;s Flow</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">
                  {data.high_confidence_days}/{days}
                </p>
                <p className="text-xs text-gray-500 mt-1">High Confidence Days</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
