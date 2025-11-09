import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { LatestPricesResponse, PriceRecord } from "../lib/api";

interface LatestPricesTableProps {
  data: LatestPricesResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

interface PriceChangeState {
  [key: string]: {
    previousPrice: number;
    direction: "up" | "down" | "none";
  };
}

interface AggregatedSource {
  source: string;
  averagePrice: number;
  buyPrice?: number;
  sellPrice?: number;
  hasSides: boolean;
  timestamp: string;
  priceDirection: "up" | "down" | "none";
  rankChange: number;
}

// Helper function to get logo path for a source
function getLogoPath(source: string): string {
  const logoExtensions: Record<string, string> = {
    digikala: "svg",
    talasea: "svg",
    wallgold: "svg",
    daric: "png",
    estjt: "png",
    goldika: "png",
    melligold: "png",
    milli: "png",
    taline: "png",
    technogold: "png",
    tgju: "png",
  };
  
  const ext = logoExtensions[source.toLowerCase()] || "png";
  return `/logos/${source.toLowerCase()}.${ext}`;
}

export function LatestPricesTable({ data, isLoading, error }: LatestPricesTableProps) {

  // Aggregate sources and calculate averages - MUST be before any conditional returns
  const aggregatedSources = useMemo<AggregatedSource[]>(() => {
    if (!data || !data.latest_prices) return [];

    const sources: AggregatedSource[] = [];

    try {
      Object.entries(data.latest_prices).forEach(([source, sides]) => {
        if (!sides || typeof sides !== 'object') return;
        
        const sideEntries = Object.entries(sides).filter(([, record]) => record !== null);
        
        if (sideEntries.length === 0) return;

        const buyRecord = sides.buy;
        const sellRecord = sides.sell;
        const defaultRecord = sides.default;

        let averagePrice: number;
        let hasSides = false;
        let buyPrice: number | undefined;
        let sellPrice: number | undefined;

        if (buyRecord && sellRecord) {
          // Has buy/sell sides - calculate average
          buyPrice = Number(buyRecord.price);
          sellPrice = Number(sellRecord.price);
          averagePrice = (buyPrice + sellPrice) / 2;
          hasSides = true;
        } else if (defaultRecord) {
          // No sides - use default price
          averagePrice = Number(defaultRecord.price);
        } else if (buyRecord) {
          averagePrice = Number(buyRecord.price);
          buyPrice = averagePrice;
          hasSides = true;
        } else if (sellRecord) {
          averagePrice = Number(sellRecord.price);
          sellPrice = averagePrice;
          hasSides = true;
        } else {
          return;
        }

      const timestamp = (buyRecord || sellRecord || defaultRecord)?.created_at || "";
      
      // Get tracking data from backend
      const trackingRecord = buyRecord || sellRecord || defaultRecord;
      const priceDirection = (trackingRecord?.price_direction || "none") as "up" | "down" | "none";
      const rankChange = trackingRecord?.rank_change || 0;

      sources.push({
        source,
        averagePrice,
        buyPrice,
        sellPrice,
        hasSides,
        timestamp,
        priceDirection,
        rankChange,
      });
    });

    // Sort by price (most expensive first) - backend already provides this order
    return sources.sort((a, b) => b.averagePrice - a.averagePrice);
    } catch (error) {
      console.error('Error aggregating sources:', error);
      return [];
    }
  }, [data]);

  // Get latest timestamp
  const latestTimestamp = useMemo(() => {
    if (!data || !data.latest_prices || Object.keys(data.latest_prices).length === 0) return null;
    
    let latest: string | null = null;
    Object.values(data.latest_prices).forEach((sides) => {
      Object.values(sides).forEach((record) => {
        if (record && (!latest || new Date(record.created_at) > new Date(latest))) {
          latest = record.created_at;
        }
      });
    });
    
    return latest ? new Date(latest).toLocaleString() : null;
  }, [data]);

  // Conditional returns AFTER all hooks
  if (isLoading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">Loading latest prices…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-red-200">
        Unable to load latest prices: {error.message}
      </div>
    );
  }

  if (aggregatedSources.length === 0) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-slate-400">No price data available.</div>;
  }

  return (
    <div className="space-y-3">
      {latestTimestamp && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-slate-400">Last Update: <span className="font-medium text-slate-300">{latestTimestamp}</span></span>
        </div>
      )}
      
      <div className="overflow-hidden rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 shadow-xl backdrop-blur-sm">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-950/80">
            <tr>
              <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-300">
                Rank Δ
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-300">
                Rank
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300">
                Source
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300">
                Price (Toman)
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-300">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {aggregatedSources.map((source, index) => {
              const rank = index + 1;
              
              return (
                <tr key={source.source} className="transition-all duration-300 hover:bg-slate-800/30">
                  <td className="px-4 py-4 text-center">
                    {source.rankChange > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        +{source.rankChange}
                      </span>
                    )}
                    {source.rankChange < 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        {source.rankChange}
                      </span>
                    )}
                    {source.rankChange === 0 && <span className="text-slate-600">=</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-bold text-slate-400">#{rank}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-white/5 p-1">
                        <Image
                          src={getLogoPath(source.source)}
                          alt={`${source.source} logo`}
                          width={32}
                          height={32}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold uppercase text-emerald-400">{source.source}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {source.hasSides && (
                        <div className="group relative">
                          <svg className="h-5 w-5 cursor-help text-slate-500 hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="invisible absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl group-hover:visible">
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-blue-300">Buy:</span>
                                <span className="font-semibold text-slate-100">{source.buyPrice?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-amber-300">Sell:</span>
                                <span className="font-semibold text-slate-100">{source.sellPrice?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <span
                        className={`text-base font-bold tabular-nums transition-all duration-300 ${
                          source.priceDirection === "up"
                            ? "text-emerald-400"
                            : source.priceDirection === "down"
                            ? "text-red-400"
                            : "text-slate-50"
                        }`}
                      >
                        {Math.round(source.averagePrice).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {source.priceDirection === "up" && (
                      <svg className="inline h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                    {source.priceDirection === "down" && (
                      <svg className="inline h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                    {source.priceDirection === "none" && <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

