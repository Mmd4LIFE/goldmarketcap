import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

import { PriceHistoryResponse } from "../lib/api";

interface PriceHistoryChartProps {
  history: PriceHistoryResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  interval: "minute" | "hour";
  onIntervalChange: (interval: "minute" | "hour") => void;
}

export function PriceHistoryChart({
  history,
  isLoading,
  error,
  interval,
  onIntervalChange,
}: PriceHistoryChartProps) {
  const data = useMemo(() => {
    if (!history) {
      return [];
    }
    return history.points.map((point) => ({
      time: new Date(point.bucket).toLocaleString(),
      average: Number(point.average_price),
      min: Number(point.min_price),
      max: Number(point.max_price),
    }));
  }, [history]);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Price History</h2>
          <p className="mt-1 text-sm text-slate-400">
            {history
              ? `${history.source.toUpperCase()} · ${history.interval.toUpperCase()} buckets`
              : "Select a source to view history"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              interval === "minute"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400/50"
                : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
            }`}
            onClick={() => onIntervalChange("minute")}
          >
            Minute
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              interval === "hour"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400/50"
                : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
            }`}
            onClick={() => onIntervalChange("hour")}
          >
            Hour
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="flex h-80 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div>
            <p className="text-sm text-slate-400">Loading history…</p>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          <strong className="font-semibold">Error:</strong> Unable to load price history: {error.message}
        </div>
      )}
      {!isLoading && !error && data.length > 0 && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis 
                tick={{ fill: "#94a3b8", fontSize: 11 }} 
                domain={['dataMin - 10', 'dataMax + 10']}
                scale="linear"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                }}
              />
              <Line type="monotone" dataKey="average" stroke="#34d399" dot={false} strokeWidth={3} name="Average" />
              <Line type="monotone" dataKey="min" stroke="#60a5fa" dot={false} strokeWidth={2} name="Min" />
              <Line type="monotone" dataKey="max" stroke="#fbbf24" dot={false} strokeWidth={2} name="Max" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {!isLoading && !error && data.length === 0 && (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/30">
          <p className="text-sm text-slate-500">No historical data available yet.</p>
        </div>
      )}
    </div>
  );
}

