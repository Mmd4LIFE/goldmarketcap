"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";

import {
  LatestPricesResponse,
  PriceHistoryResponse,
  fetchLatestPrices,
  fetchPriceHistory,
} from "../lib/api";
import { LatestPricesTable } from "../components/LatestPricesTable";
import { PriceHistoryChart } from "../components/PriceHistoryChart";

type HistoryKey = readonly ["price-history", string, "minute" | "hour"];

export default function DashboardPage() {
  const [selectedSource, setSelectedSource] = useState<string>("milli");
  const [interval, setInterval] = useState<"minute" | "hour">("hour");
  const [tokenConfigured, setTokenConfigured] = useState(false);

  useEffect(() => {
    // Check token configuration on mount
    fetch('/api/config', { cache: 'no-store' })
      .then(res => res.json())
      .then(config => {
        setTokenConfigured(Boolean(config.apiToken && config.apiToken !== "change-me-api-token"));
      })
      .catch(() => setTokenConfigured(false));
  }, []);

  const {
    data: latestPrices,
    error: latestError,
    isLoading: latestLoading,
  } = useSWR<LatestPricesResponse>(["latest-prices"], () => fetchLatestPrices(), {
    refreshInterval: 60_000,
  });

  const historyKey: HistoryKey | null = selectedSource
    ? ["price-history", selectedSource, interval]
    : null;

  const historyFetcher = (key: HistoryKey) => {
    const [, source, bucket] = key;
    return fetchPriceHistory(source, bucket);
  };

  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
  } = useSWR<PriceHistoryResponse>(
    historyKey,
    historyFetcher,
    {
      refreshInterval: 60_000,
    }
  );

  const sources = useMemo(() => {
    if (!latestPrices) {
      return [];
    }
    return Object.keys(latestPrices.latest_prices);
  }, [latestPrices]);

  return (
    <div className="space-y-8">
      {!tokenConfigured && (
        <div className="rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-amber-200">Configuration Required</h2>
              <p className="mt-1 text-sm text-amber-100/90">
                API access is protected with bearer tokens. Update <code className="rounded bg-amber-900/30 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_API_TOKEN</code> in your environment to match <code className="rounded bg-amber-900/30 px-1.5 py-0.5 font-mono text-xs">API_BEARER_TOKEN</code>, then rebuild the frontend container.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Live Spot Prices</h2>
            <p className="mt-1 text-sm text-slate-400">
              Aggregated from multiple upstream providers with per-source buy/sell data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="source-select" className="text-sm font-medium text-slate-300">
              Chart Source:
            </label>
            <select
              id="source-select"
              value={selectedSource}
              onChange={(event) => setSelectedSource(event.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm transition-colors hover:bg-slate-700/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <LatestPricesTable data={latestPrices} error={latestError as Error | undefined} isLoading={latestLoading} />
      </section>

      <section>
        <PriceHistoryChart
          history={history}
          error={historyError as Error | undefined}
          isLoading={historyLoading}
          interval={interval}
          onIntervalChange={setInterval}
        />
      </section>
    </div>
  );
}

