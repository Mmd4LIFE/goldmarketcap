"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";

import {
  PriceHistoryResponse,
  fetchPriceHistory,
} from "../../../lib/api";
import { PriceHistoryChart } from "../../../components/PriceHistoryChart";

type HistoryKey = readonly ["price-history", string, "minute" | "hour"];

export default function ChartPage() {
  const params = useParams();
  const router = useRouter();
  const source = params?.source as string;
  const [interval, setInterval] = useState<"minute" | "hour">("hour");

  const historyKey: HistoryKey | null = source
    ? ["price-history", source, interval]
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/")}
            className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Live Prices
          </button>
          <h1 className="text-3xl font-bold text-slate-100">
            {source?.toUpperCase()} Price History
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Historical price data and trends
          </p>
        </div>
      </div>

      <PriceHistoryChart
        history={history}
        error={historyError as Error | undefined}
        isLoading={historyLoading}
        interval={interval}
        onIntervalChange={setInterval}
      />
    </div>
  );
}

