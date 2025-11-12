"use client";

import { AnalyticsStats } from "../lib/api";

interface AnalyticsCardsProps {
  stats: AnalyticsStats | null;
  isLoading: boolean;
  error?: Error;
}

export function AnalyticsCards({ stats, isLoading, error }: AnalyticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-slate-700/50 bg-slate-900/60 p-4 h-32" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const formatPrice = (price: number) => Math.round(price).toLocaleString();
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
      {/* Most Expensive */}
      <div className="group rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-red-500/50 hover:shadow-red-500/20">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Most Expensive</h3>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-red-400 uppercase">{stats.most_expensive_24h.source}</p>
          <p className="text-sm text-slate-300">{formatPrice(parseFloat(stats.most_expensive_24h.price))} T</p>
          <p className="text-xs text-slate-500">at {formatTime(stats.most_expensive_24h.timestamp)}</p>
        </div>
      </div>

      {/* Most Cheapest */}
      <div className="group rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:shadow-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Most Cheapest</h3>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-emerald-400 uppercase">{stats.most_cheapest_24h.source}</p>
          <p className="text-sm text-slate-300">{formatPrice(parseFloat(stats.most_cheapest_24h.price))} T</p>
          <p className="text-xs text-slate-500">at {formatTime(stats.most_cheapest_24h.timestamp)}</p>
        </div>
      </div>

      {/* Average Price */}
      <div className="group rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-blue-500/50 hover:shadow-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Price</h3>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-blue-400">{Math.round(stats.average_price).toLocaleString()} T</p>
          {stats.average_price_change_24h !== null && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              stats.average_price_change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <span>{stats.average_price_change_24h >= 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(stats.average_price_change_24h).toFixed(2)}%</span>
            </div>
          )}
          <p className="text-xs text-slate-500">24h change</p>
        </div>
      </div>

      {/* Most Changed */}
      <div className="group rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-amber-500/50 hover:shadow-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Most Volatile</h3>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-amber-400 uppercase">{stats.most_changed_24h.source}</p>
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            stats.most_changed_24h.change >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <span>{stats.most_changed_24h.change >= 0 ? '▲' : '▼'}</span>
            <span>{Math.abs(stats.most_changed_24h.change).toFixed(2)}%</span>
          </div>
          <p className="text-xs text-slate-500">24h change</p>
        </div>
      </div>

      {/* Least Changed */}
      <div className="group rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-purple-500/50 hover:shadow-purple-500/20">
        <div className="flex items-center gap-2 mb-2">
          <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Most Stable</h3>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-purple-400 uppercase">{stats.least_changed_24h.source}</p>
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            stats.least_changed_24h.change >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <span>{stats.least_changed_24h.change >= 0 ? '▲' : '▼'}</span>
            <span>{Math.abs(stats.least_changed_24h.change).toFixed(2)}%</span>
          </div>
          <p className="text-xs text-slate-500">24h change</p>
        </div>
      </div>
    </div>
  );
}

