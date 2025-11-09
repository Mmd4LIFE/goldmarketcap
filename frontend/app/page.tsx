"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

import {
  LatestPricesResponse,
  fetchLatestPrices,
} from "../lib/api";
import { LatestPricesTable } from "../components/LatestPricesTable";

export default function DashboardPage() {
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
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Live Spot Prices</h2>
          <p className="mt-1 text-sm text-slate-400">
            Aggregated from multiple upstream providers with per-source buy/sell data. Click any row to view price history.
          </p>
        </div>
        <LatestPricesTable data={latestPrices} error={latestError as Error | undefined} isLoading={latestLoading} />
      </section>
    </div>
  );
}

