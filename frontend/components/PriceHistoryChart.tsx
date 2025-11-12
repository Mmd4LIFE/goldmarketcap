import useSWR from "swr";

import { MinuteHistoryResponse, HourCandleResponse, fetchMinuteHistory, fetchHourCandles } from "../lib/api";
import { MinuteChart } from "./MinuteChart";
import { CandlestickChart } from "./CandlestickChart";

interface PriceHistoryChartProps {
  source: string;
  interval: "minute" | "hour";
  onIntervalChange: (interval: "minute" | "hour") => void;
}

export function PriceHistoryChart({
  source,
  interval,
  onIntervalChange,
}: PriceHistoryChartProps) {
  // Fetch minute data
  const {
    data: minuteData,
    error: minuteError,
    isLoading: minuteLoading,
  } = useSWR<MinuteHistoryResponse>(
    interval === "minute" ? ["minute-history", source] : null,
    () => fetchMinuteHistory(source),
    { refreshInterval: 60_000 }
  );

  // Fetch hour candles data
  const {
    data: hourData,
    error: hourError,
    isLoading: hourLoading,
  } = useSWR<HourCandleResponse>(
    interval === "hour" ? ["hour-candles", source] : null,
    () => fetchHourCandles(source),
    { refreshInterval: 300_000 } // Refresh every 5 minutes for hourly
  );

  const currentData = interval === "minute" ? minuteData : hourData;
  const chartType = interval === "minute" 
    ? (currentData ? (currentData.has_sides ? "Two Lines" : "Single Line") : "...")
    : "Candlestick";

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">📊 Price Charts</h2>
          <p className="mt-1 text-sm text-slate-400">
            {source ? `${source.toUpperCase()} · ${chartType} Chart` : "Select a source to view charts"}
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
            Minutely
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              interval === "hour"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400/50"
                : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
            }`}
            onClick={() => onIntervalChange("hour")}
          >
            Hourly
          </button>
        </div>
      </div>
      
      {interval === "minute" ? (
        <MinuteChart 
          history={minuteData}
          isLoading={minuteLoading}
          error={minuteError as Error | undefined}
        />
      ) : (
        <CandlestickChart 
          history={hourData}
          isLoading={hourLoading}
          error={hourError as Error | undefined}
        />
      )}
    </div>
  );
}

