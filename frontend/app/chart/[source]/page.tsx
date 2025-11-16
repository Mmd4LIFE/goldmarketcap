"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

// Lazy load chart component to improve initial page load
const PriceHistoryChart = dynamic(() => import("../../../components/PriceHistoryChart").then(mod => ({ default: mod.PriceHistoryChart })), {
  loading: () => (
    <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-6 shadow-xl">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-700/50 rounded w-1/3"></div>
        <div className="h-80 bg-slate-800/50 rounded"></div>
      </div>
    </div>
  ),
  ssr: false,
});

export default function ChartPage() {
  const params = useParams();
  const router = useRouter();
  const source = params?.source as string;
  const [interval, setInterval] = useState<"minute" | "hour">("hour");

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
            {source?.toUpperCase()} Price Charts
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Minute-by-minute trends and hourly candlestick analysis
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-6 shadow-xl">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-700/50 rounded w-1/3"></div>
            <div className="h-80 bg-slate-800/50 rounded"></div>
          </div>
        </div>
      }>
        <PriceHistoryChart
          source={source}
          interval={interval}
          onIntervalChange={setInterval}
        />
      </Suspense>
    </div>
  );
}

