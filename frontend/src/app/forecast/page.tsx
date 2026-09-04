"use client";
import { useState, useEffect } from "react";
import { getForecast } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ForecastPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getForecast(days)
      .then((data) => {
        setData(data);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to fetch forecast. Is the backend running?");
        setIsLoading(false);
      });
  }, [days]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-3">Cash Position Forecast</h1>
      <p className="text-black bg-accent px-2 py-1 font-bold inline-block mb-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {days}-day forward projection from reconciled settlement data
      </p>

      <div className="flex gap-3 mb-10">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-6 py-2 border-2 border-black rounded-none text-sm font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
              days === d
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="mb-6 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Overall confidence
            </span>
            <span className={`text-xs font-black uppercase px-2 py-0.5 border-2 border-black ${
              data.overall_confidence === "high"
                ? "bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                : data.overall_confidence === "medium"
                ? "bg-accent text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                : "bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            }`}>
              {data.overall_confidence}
            </span>
          </div>

          <div className="space-y-3 mb-10">
            {data.days?.map((day: any) => (
              <div
                key={day.date}
                className="flex items-center gap-4 p-3 bg-white rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <span className="text-xs text-black w-24 font-mono font-bold bg-gray-100 border border-black px-1 text-center py-0.5">{day.date}</span>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 border border-black rounded-none overflow-hidden relative">
                    <div
                      className={`h-full absolute left-0 top-0 border-r border-black ${
                        day.projected_flow < 0 ? "bg-red-500" : "bg-green-400"
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
                <span className="text-sm font-black text-black w-40 text-right">
                  {day.projected_flow < 0 ? "-" : ""}Rs.{Math.abs(day.projected_flow).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider w-16 text-center border-2 border-black px-1 ${
                  day.confidence === "high"
                    ? "bg-green-400 text-black"
                    : day.confidence === "medium"
                    ? "bg-accent text-black"
                    : "bg-red-500 text-white"
                }`}>
                  {day.confidence}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-none p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
            <div className="absolute top-0 right-0 border-b-2 border-l-2 border-black bg-accent px-3 py-1 font-bold text-xs uppercase tracking-widest">Insights</div>
            <h2 className="text-lg font-black uppercase tracking-wide text-black mb-6">Summary</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center border-t-4 border-black pt-3">
                <p className="text-2xl font-black text-black">
                  Rs.{data.projected_position?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-bold text-black uppercase tracking-wider mt-2">Projected Position ({days}d)</p>
              </div>
              <div className="text-center border-t-4 border-black pt-3">
                <p className="text-2xl font-black text-black">
                  Rs.{data.tomorrows_flow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-bold text-black uppercase tracking-wider mt-2">Tomorrow&apos;s Flow</p>
              </div>
              <div className="text-center border-t-4 border-green-500 pt-3">
                <p className="text-2xl font-black text-black">
                  {data.high_confidence_days}/{days}
                </p>
                <p className="text-xs font-bold text-black uppercase tracking-wider mt-2">High Confidence Days</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
