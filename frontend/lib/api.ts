// API client for the gold price backend.
//
// Reads the backend base URL and bearer token from runtime-injected env
// (window.__ENV__, set by app/env-script.tsx) with a fallback to build-time
// NEXT_PUBLIC_* values. The base URL already includes the "/api/v1" prefix.

const DEFAULT_BASE_URL = "http://localhost:8005/api/v1";

interface RuntimeEnv {
  NEXT_PUBLIC_API_BASE_URL?: string;
  NEXT_PUBLIC_API_TOKEN?: string;
}

function getRuntimeEnv(): RuntimeEnv {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __ENV__?: RuntimeEnv }).__ENV__;
    if (injected) {
      return injected;
    }
  }
  return {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_TOKEN: process.env.NEXT_PUBLIC_API_TOKEN,
  };
}

function getBaseUrl(): string {
  const env = getRuntimeEnv();
  const url = env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
  return url.replace(/\/+$/, "");
}

function getToken(): string {
  return getRuntimeEnv().NEXT_PUBLIC_API_TOKEN || "";
}

async function apiGet<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
  const base = getBaseUrl();
  const url = new URL(`${base}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const token = getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // ignore body parse errors, keep generic message
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Types (mirror backend app/schemas.py). Decimal fields are serialized as JSON
// strings, so they are typed as `string`; consumers coerce with
// Number()/parseFloat().
// ---------------------------------------------------------------------------

export interface PriceRecord {
  source: string;
  side: string | null;
  currency: string;
  price: string;
  created_at: string;
  price_direction?: "up" | "down" | "none" | null;
  rank_change?: number | null;
  sparkline_7d?: number[] | null;
  change_1h?: number | null;
  change_24h?: number | null;
  change_7d?: number | null;
}

export interface SideMap {
  buy?: PriceRecord | null;
  sell?: PriceRecord | null;
  default?: PriceRecord | null;
  [side: string]: PriceRecord | null | undefined;
}

export interface LatestPricesResponse {
  latest_prices: Record<string, SideMap>;
}

export interface SourceWithTime {
  source: string;
  price: string;
  timestamp: string;
}

export interface SourceWithChange {
  source: string;
  change: number;
}

export interface AnalyticsStats {
  most_expensive_24h: SourceWithTime;
  most_cheapest_24h: SourceWithTime;
  average_price: number;
  average_price_change_24h: number | null;
  most_changed_24h: SourceWithChange;
  least_changed_24h: SourceWithChange;
}

export interface MinuteHistoryPoint {
  bucket: string;
  average_price?: string | null;
  buy_price?: string | null;
  sell_price?: string | null;
}

export interface MinuteHistoryResponse {
  source: string;
  interval: string;
  start_time?: string;
  end_time?: string;
  has_sides: boolean;
  points: MinuteHistoryPoint[];
}

export interface HourCandlePoint {
  bucket: string;
  open: string;
  close: string;
  high: string;
  low: string;
}

export interface HourCandleResponse {
  source: string;
  interval: string;
  start_time?: string;
  end_time?: string;
  has_sides: boolean;
  buy_candles?: HourCandlePoint[] | null;
  sell_candles?: HourCandlePoint[] | null;
  candles?: HourCandlePoint[] | null;
}

export interface HistoryRange {
  start?: string;
  end?: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export function fetchLatestPrices(): Promise<LatestPricesResponse> {
  return apiGet<LatestPricesResponse>("/prices/latest");
}

export function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  return apiGet<AnalyticsStats>("/analytics/stats");
}

export function fetchMinuteHistory(source: string, range?: HistoryRange): Promise<MinuteHistoryResponse> {
  return apiGet<MinuteHistoryResponse>(`/prices/${encodeURIComponent(source)}/history/minute`, {
    start: range?.start,
    end: range?.end,
  });
}

export function fetchHourCandles(source: string, range?: HistoryRange): Promise<HourCandleResponse> {
  return apiGet<HourCandleResponse>(`/prices/${encodeURIComponent(source)}/history/hour/candles`, {
    start: range?.start,
    end: range?.end,
  });
}

export function fetchDayCandles(source: string, range?: HistoryRange): Promise<HourCandleResponse> {
  return apiGet<HourCandleResponse>(`/prices/${encodeURIComponent(source)}/history/day/candles`, {
    start: range?.start,
    end: range?.end,
  });
}

export function fetchWeekCandles(source: string, range?: HistoryRange): Promise<HourCandleResponse> {
  return apiGet<HourCandleResponse>(`/prices/${encodeURIComponent(source)}/history/week/candles`, {
    start: range?.start,
    end: range?.end,
  });
}

export function fetchMonthCandles(source: string, range?: HistoryRange): Promise<HourCandleResponse> {
  return apiGet<HourCandleResponse>(`/prices/${encodeURIComponent(source)}/history/month/candles`, {
    start: range?.start,
    end: range?.end,
  });
}
