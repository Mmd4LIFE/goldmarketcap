import { lazy, Suspense, useMemo, useState } from "react";
import useSWR from "swr";

import { MinuteHistoryResponse, HourCandleResponse, fetchMinuteHistory, fetchHourCandles, fetchDayCandles, fetchWeekCandles, fetchMonthCandles } from "../lib/api";

// Lazy load chart components to improve initial load time
const MinuteChart = lazy(() => import("./MinuteChart").then(mod => ({ default: mod.MinuteChart })));
const CandlestickChart = lazy(() => import("./CandlestickChart").then(mod => ({ default: mod.CandlestickChart })));

interface PriceHistoryChartProps {
  source: string;
  interval: "minute" | "hour";
  onIntervalChange: (interval: "minute" | "hour") => void;
}

type Timeframe = "15m" | "1h" | "24h" | "1W" | "1M";

type Resolution = "minute" | "hour" | "day" | "week" | "month";

function mapTimeframeToResolution(tf: Timeframe): Resolution {
  switch (tf) {
    case "15m":
      return "minute"; // future: 15m aggregation
    case "1h":
      return "hour";
    case "24h":
      return "day";
    case "1W":
      return "week";
    case "1M":
      return "month";
  }
}

export function PriceHistoryChart({
  source,
  interval,
  onIntervalChange,
}: PriceHistoryChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const resolution = useMemo(() => mapTimeframeToResolution(timeframe), [timeframe]);

  // Keys for SWR
  const key = source ? ["candles", source, resolution] : null;

  const fetcher = async () => {
    const end = new Date();
    const start = new Date(end);
    if (resolution === "hour") start.setDate(end.getDate() - 7); // 1 week of 1h candles
    if (resolution === "day") start.setMonth(end.getMonth() - 6); // 6 months of 1D candles
    if (resolution === "week") start.setFullYear(end.getFullYear() - 3); // 3 years
    if (resolution === "month") start.setFullYear(end.getFullYear() - 5); // 5 years

    const opts = { start: start.toISOString(), end: end.toISOString() };

    if (resolution === "hour") return fetchHourCandles(source, opts);
    if (resolution === "day") return fetchDayCandles(source, opts);
    if (resolution === "week") return fetchWeekCandles(source, opts);
    if (resolution === "month") return fetchMonthCandles(source, opts);

    // fallback to minute (line chart)
    return fetchMinuteHistory(source, { start: new Date(end.getTime() - 24 * 3600 * 1000).toISOString(), end: end.toISOString() });
  };

  const { data, error, isLoading } = useSWR<MinuteHistoryResponse | HourCandleResponse>(key, fetcher, {
    refreshInterval: resolution === "hour" || resolution === "day" || resolution === "week" || resolution === "month" ? 300_000 : 60_000,
  });

  const chartType = ((): string => {
    if (!data) return "...";
    if ((data as any).candles || (data as any).buy_candles || (data as any).sell_candles) return `${timeframe} Candles`;
    return "Line";
  })();

  const frames: Timeframe[] = ["15m", "1h", "24h", "1W", "1M"];

  return (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">📊 Price Charts</h2>
          <p className="mt-1 text-sm text-slate-400">
            {source ? `${source.toUpperCase()} · ${chartType}` : "Select a source to view charts"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 p-1">
            {frames.map((f) => (
              <button
                key={f}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeframe === f
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                onClick={() => setTimeframe(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {resolution === "minute" ? (
        <Suspense fallback={<div className="flex h-96 items-center justify-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div></div>}>
          <MinuteChart 
            history={data as MinuteHistoryResponse}
            isLoading={isLoading}
            error={error as Error | undefined}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="flex h-96 items-center justify-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div></div>}>
          <CandlestickChart 
            history={data as HourCandleResponse}
            isLoading={isLoading}
            error={error as Error | undefined}
          />
        </Suspense>
      )}
    </div>
  );
}

