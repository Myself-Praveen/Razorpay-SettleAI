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
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">Cash Position Forecast</h1>
      <p className="text-primary bg-primary/10 px-3 py-1 font-medium inline-block mb-10 rounded-full text-sm border border-primary/20">
        {days}-day forward projection from reconciled settlement data
      </p>

      <div className="flex gap-3 mb-10">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-6 py-2 border rounded-full text-sm font-semibold transition-all shadow-sm hover:shadow-md ${
              days === d
                ? "bg-foreground text-background border-transparent"
                : "bg-white text-foreground hover:bg-muted/50 border-border"
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
            <span className="text-xs font-semibold tracking-wider text-muted-foreground">
              Overall confidence
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
              data.overall_confidence === "high"
                ? "bg-green-50 text-green-700 border-green-200"
                : data.overall_confidence === "medium"
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {data.overall_confidence}
            </span>
          </div>

          <div className="space-y-3 mb-10">
            {data.days?.map((day: any) => (
              <div
                key={day.date}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-xs text-muted-foreground w-24 font-mono font-semibold bg-muted/50 border border-border/50 rounded px-1.5 text-center py-1">{day.date}</span>
                <div className="flex-1">
                  <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full absolute left-0 top-0 rounded-full ${
                        day.projected_flow < 0 ? "bg-red-400" : "bg-green-500"
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
                <span className="text-sm font-semibold text-foreground w-40 text-right">
                  {day.projected_flow < 0 ? "-" : ""}Rs.{Math.abs(day.projected_flow).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider w-16 text-center rounded-md border px-1 ${
                  day.confidence === "high"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : day.confidence === "medium"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {day.confidence}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 border border-border shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 border-b border-l border-border bg-muted/30 px-3 py-1 font-semibold text-xs text-muted-foreground rounded-bl-lg">Insights</div>
            <h2 className="text-lg font-semibold tracking-wide text-foreground mb-6">Summary</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center border-t-2 border-border pt-4">
                <p className="text-2xl font-bold text-foreground">
                  Rs.{data.projected_position?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">Projected Position ({days}d)</p>
              </div>
              <div className="text-center border-t-2 border-border pt-4">
                <p className="text-2xl font-bold text-foreground">
                  Rs.{data.tomorrows_flow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">Tomorrow&apos;s Flow</p>
              </div>
              <div className="text-center border-t-2 border-green-500 pt-4">
                <p className="text-2xl font-bold text-foreground">
                  {data.high_confidence_days}/{days}
                </p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">High Confidence Days</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
