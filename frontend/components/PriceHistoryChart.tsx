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

type Timeframe = "Min" | "15m" | "1h" | "24h" | "1W" | "1M";

type Resolution = "minute-line" | "minute" | "hour" | "day" | "week" | "month";

function mapTimeframeToResolution(tf: Timeframe): Resolution {
  switch (tf) {
    case "Min":
      return "minute-line"; // pure minutely line chart
    case "15m":
      return "minute"; // fetch minute data, then aggregate to 15m candles
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

function floorToBucket(date: Date, minutes: number): string {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m - (m % minutes));
  return d.toISOString();
}

export function PriceHistoryChart({
  source,
  interval,
  onIntervalChange,
}: PriceHistoryChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const resolution = useMemo(() => mapTimeframeToResolution(timeframe), [timeframe]);

  // Keys for SWR
  const key = source ? ["candles", source, resolution, timeframe] : null;

  const fetcher = async () => {
    const end = new Date();
    const start = new Date(end);
    if (timeframe === "Min") start.setHours(end.getHours() - 6); // 6 hours of minute data
    if (timeframe === "15m") start.setHours(end.getHours() - 12); // 12h minute for quick aggregation
    if (resolution === "hour") start.setDate(end.getDate() - 7); // 1 week of 1h candles
    if (resolution === "day") start.setMonth(end.getMonth() - 6); // 6 months of 1D candles
    if (resolution === "week") start.setFullYear(end.getFullYear() - 3); // 3 years
    if (resolution === "month") start.setFullYear(end.getFullYear() - 5); // 5 years

    const opts = { start: start.toISOString(), end: end.toISOString() };

    if (timeframe === "Min") return fetchMinuteHistory(source, opts);
    if (timeframe === "15m") return fetchMinuteHistory(source, opts);
    if (resolution === "hour") return fetchHourCandles(source, opts);
    if (resolution === "day") return fetchDayCandles(source, opts);
    if (resolution === "week") return fetchWeekCandles(source, opts);
    if (resolution === "month") return fetchMonthCandles(source, opts);

    return fetchMinuteHistory(source, opts);
  };

  const { data, error, isLoading } = useSWR<MinuteHistoryResponse | HourCandleResponse>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: timeframe === "Min" || timeframe === "15m" ? 30_000 : 180_000,
    refreshInterval: timeframe === "Min" || timeframe === "15m" ? 60_000 : 300_000,
  });

  // If 15m, aggregate minute points into 15-minute candles
  const fifteenMinCandles: HourCandleResponse | null = useMemo(() => {
    try {
      const minute = data as MinuteHistoryResponse;
      if (timeframe !== "15m" || !minute || !minute.points) return null;

      const hasSides = minute.has_sides;

      if (hasSides) {
        const buyMap: Record<string, { open?: number; high: number; low: number; close?: number }> = {};
        const sellMap: Record<string, { open?: number; high: number; low: number; close?: number }> = {};
        minute.points.forEach(p => {
          const t = new Date(p.bucket);
          const bucket = floorToBucket(t, 15);
          if (p.buy_price) {
            const v = Number(p.buy_price);
            if (Number.isFinite(v)) {
              const o = buyMap[bucket] || { high: v, low: v };
              if (o.open === undefined) o.open = v;
              o.high = Math.max(o.high, v);
              o.low = Math.min(o.low, v);
              o.close = v;
              buyMap[bucket] = o;
            }
          }
          if (p.sell_price) {
            const v = Number(p.sell_price);
            if (Number.isFinite(v)) {
              const o = sellMap[bucket] || { high: v, low: v };
              if (o.open === undefined) o.open = v;
              o.high = Math.max(o.high, v);
              o.low = Math.min(o.low, v);
              o.close = v;
              sellMap[bucket] = o;
            }
          }
        });
        const buy_candles = Object.entries(buyMap)
          .filter(([, o]) => o.open !== undefined && o.close !== undefined)
          .map(([bucket, o]) => ({ bucket: new Date(bucket).toISOString(), open: String(o.open), close: String(o.close), high: String(o.high), low: String(o.low) }))
          .sort((a,b)=>new Date(a.bucket).getTime()-new Date(b.bucket).getTime());
        const sell_candles = Object.entries(sellMap)
          .filter(([, o]) => o.open !== undefined && o.close !== undefined)
          .map(([bucket, o]) => ({ bucket: new Date(bucket).toISOString(), open: String(o.open), close: String(o.close), high: String(o.high), low: String(o.low) }))
          .sort((a,b)=>new Date(a.bucket).getTime()-new Date(b.bucket).getTime());
        return { source, interval: "15m", has_sides: true, buy_candles, sell_candles } as unknown as HourCandleResponse;
      } else {
        const map: Record<string, { open?: number; high: number; low: number; close?: number }> = {};
        minute.points.forEach(p => {
          const t = new Date(p.bucket);
          const bucket = floorToBucket(t, 15);
          const raw = p.average_price ?? p.buy_price ?? p.sell_price;
          const v = Number(raw);
          if (!Number.isFinite(v)) return;
          const o = map[bucket] || { high: v, low: v };
          if (o.open === undefined) o.open = v;
          o.high = Math.max(o.high, v);
          o.low = Math.min(o.low, v);
          o.close = v;
          map[bucket] = o;
        });
        const candles = Object.entries(map)
          .filter(([, o]) => o.open !== undefined && o.close !== undefined)
          .map(([bucket, o]) => ({ bucket: new Date(bucket).toISOString(), open: String(o.open), close: String(o.close), high: String(o.high), low: String(o.low) }))
          .sort((a,b)=>new Date(a.bucket).getTime()-new Date(b.bucket).getTime());
        return { source, interval: "15m", has_sides: false, candles } as unknown as HourCandleResponse;
      }
    } catch {
      return null;
    }
  }, [data, timeframe, source]);

  const chartType = ((): string => {
    if (timeframe === "Min") return "Minutely · Line";
    if (timeframe === "15m") return "15m Candles";
    if (!data) return "...";
    if ((data as any).candles || (data as any).buy_candles || (data as any).sell_candles) return `${timeframe} Candles`;
    return "Line";
  })();

  const frames: Timeframe[] = ["Min", "15m", "1h", "24h", "1W", "1M"];

  const is15mReady = timeframe !== "15m" || (fifteenMinCandles && ((fifteenMinCandles.candles && fifteenMinCandles.candles.length) || (fifteenMinCandles.buy_candles && fifteenMinCandles.buy_candles.length) || (fifteenMinCandles.sell_candles && fifteenMinCandles.sell_candles.length)));

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

      {timeframe === "Min" ? (
        <Suspense fallback={<div className="flex h-96 items-center justify-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div></div>}>
          <MinuteChart 
            history={data as MinuteHistoryResponse}
            isLoading={isLoading}
            error={error as Error | undefined}
          />
        </Suspense>
      ) : timeframe === "15m" ? (
        is15mReady ? (
          <Suspense fallback={<div className="flex h-96 items-center justify-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div></div>}>
            <CandlestickChart 
              history={fifteenMinCandles as HourCandleResponse}
              isLoading={isLoading}
              error={error as Error | undefined}
            />
          </Suspense>
        ) : (
          <div className="flex h-96 items-center justify-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div></div>
        )
      ) : resolution === "minute" ? (
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

