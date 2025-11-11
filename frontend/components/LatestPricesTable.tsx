import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
  sparkline7d: number[];
  change1h?: number;
  change24h?: number;
  change7d?: number;
}

// Helper function to get logo path for a source
function getLogoPath(source: string): string {
  const logoExtensions: Record<string, string> = {
    digikala: "svg",
    talasea: "svg",
    wallgold: "svg",
    hamrahgold: "svg",
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

// Helper function to get website URL for a source
function getSourceUrl(source: string): string {
  const urls: Record<string, string> = {
    tgju: "https://www.tgju.org/",
    wallgold: "https://wallgold.ir/app",
    technogold: "https://technogold.gold/",
    estjt: "https://www.estjt.ir/",
    digikala: "https://www.digikala.com/wealth/my-assets/",
    goldika: "https://goldika.ir/",
    milli: "https://milli.gold/",
    taline: "https://taline.ir/",
    talasea: "https://talasea.ir/",
    daric: "https://daric.gold/",
    melligold: "https://melligold.com/",
    hamrahgold: "https://hamrahgold.com/",
  };
  
  return urls[source.toLowerCase()] || "#";
}

// Sparkline component
function Sparkline({ data, priceDirection, className = "" }: { data: number[]; priceDirection?: "up" | "down" | "none"; className?: string }) {
  if (!data || data.length === 0) {
    return <div className={`flex items-center justify-center text-slate-600 ${className}`}>—</div>;
  }

  const width = 120;
  const height = 40;
  const padding = 2;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");
  
  // Use same color logic as price
  let color = "#94a3b8"; // slate-400 for "none"
  if (priceDirection === "up") {
    color = "#10b981"; // emerald-400
  } else if (priceDirection === "down") {
    color = "#ef4444"; // red-400
  }
  
  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

export function LatestPricesTable({ data, isLoading, error }: LatestPricesTableProps) {
  const router = useRouter();
  const [headerContainer, setHeaderContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderContainer(document.getElementById("last-update-container"));
  }, []);

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
      const sparkline7d = (trackingRecord?.sparkline_7d || []) as number[];
      const change1h = trackingRecord?.change_1h;
      const change24h = trackingRecord?.change_24h;
      const change7d = trackingRecord?.change_7d;

      sources.push({
        source,
        averagePrice,
        buyPrice,
        sellPrice,
        hasSides,
        timestamp,
        priceDirection,
        rankChange,
        sparkline7d,
        change1h,
        change24h,
        change7d,
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
    <>
      {latestTimestamp && headerContainer && createPortal(
        <div className="flex items-center gap-2 text-sm">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-slate-400">Last Update: <span className="font-medium text-slate-300">{latestTimestamp}</span></span>
        </div>,
        headerContainer
      )}
      
      {/* Mobile View - Card List */}
      <div className="block lg:hidden space-y-2">
        {aggregatedSources.map((source, index) => {
          const rank = index + 1;
          return (
            <div
              key={source.source}
              onClick={() => router.push(`/chart/${source.source.toLowerCase()}`)}
              className="cursor-pointer rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-3 transition-all hover:bg-slate-800/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Rank Delta */}
                  <div className="w-8 flex-shrink-0">
                    {source.rankChange !== 0 && (
                      <span className={`text-xs font-semibold ${source.rankChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {source.rankChange > 0 ? '↑' : '↓'}{Math.abs(source.rankChange)}
                      </span>
                    )}
                  </div>
                  
                  {/* Rank */}
                  <div className="w-8 text-sm font-semibold text-slate-400">
                    {rank}
                  </div>
                  
                  {/* Logo & Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded bg-slate-200 p-0.5">
                      <Image
                        src={getLogoPath(source.source)}
                        alt={`${source.source} logo`}
                        width={24}
                        height={24}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-300 truncate uppercase">{source.source}</span>
                  </div>
                </div>
                
                {/* Price */}
                <div className="text-right pl-2">
                  <div className={`text-sm font-semibold ${
                    source.priceDirection === "up" ? "text-emerald-400" :
                    source.priceDirection === "down" ? "text-red-400" : "text-slate-200"
                  }`}>
                    {Math.round(source.averagePrice).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden lg:block rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-900/50 shadow-xl backdrop-blur-sm overflow-hidden">
        <table className="w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-950/80 sticky top-0 z-20">
            <tr>
              <th scope="col" className="w-10 px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                Δ
              </th>
              <th scope="col" className="w-10 px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                Source
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                Link
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                Price
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                1h %
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                24h %
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                7d %
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/95 backdrop-blur-sm">
                Last 7 Days
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {aggregatedSources.map((source, index) => {
              const rank = index + 1;
              
              return (
                <tr 
                  key={source.source} 
                  onClick={() => router.push(`/chart/${source.source.toLowerCase()}`)}
                  className="cursor-pointer transition-all duration-200 hover:bg-slate-800/30"
                >
                  <td className="w-10 px-2 py-2 text-center">
                    {source.rankChange > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-semibold text-emerald-400">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {source.rankChange}
                      </span>
                    )}
                    {source.rankChange < 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        {Math.abs(source.rankChange)}
                      </span>
                    )}
                    {source.rankChange === 0 && <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="w-10 px-2 py-2 text-center">
                    <span className="text-sm font-semibold text-slate-400">{rank}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded bg-slate-200 p-0.5">
                        <Image
                          src={getLogoPath(source.source)}
                          alt={`${source.source} logo`}
                          width={24}
                          height={24}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-300 uppercase">{source.source}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a 
                      href={getSourceUrl(source.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded border border-slate-600/50 bg-slate-800/30 px-2 py-0.5 text-xs font-medium text-slate-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Link
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {source.hasSides && (
                        <div className="group relative" onClick={(e) => e.stopPropagation()}>
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
                        className={`text-sm font-semibold tabular-nums ${
                          source.priceDirection === "up"
                            ? "text-emerald-400"
                            : source.priceDirection === "down"
                            ? "text-red-400"
                            : "text-slate-200"
                        }`}
                      >
                        {Math.round(source.averagePrice).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {source.change1h !== undefined && source.change1h !== null ? (
                      <span className={`text-xs font-semibold ${source.change1h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {source.change1h >= 0 ? '▲' : '▼'} {Math.abs(source.change1h).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {source.change24h !== undefined && source.change24h !== null ? (
                      <span className={`text-xs font-semibold ${source.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {source.change24h >= 0 ? '▲' : '▼'} {Math.abs(source.change24h).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {source.change7d !== undefined && source.change7d !== null ? (
                      <span className={`text-xs font-semibold ${source.change7d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {source.change7d >= 0 ? '▲' : '▼'} {Math.abs(source.change7d).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Sparkline data={source.sparkline7d} priceDirection={source.priceDirection} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

