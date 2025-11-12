"use client";

import { useEffect, useRef, useMemo } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";

import { HourCandleResponse, HourCandlePoint } from "../lib/api";

interface CandlestickChartProps {
  history: HourCandleResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function CandlestickChart({ history, isLoading, error }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const buySeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const sellSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const singleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Process data to ensure close of previous = open of next
  const processedData = useMemo(() => {
    if (!history) {
      return { buyData: [], sellData: [], singleData: [] };
    }

    const processCandles = (candles: HourCandlePoint[]): CandlestickData[] => {
      if (candles.length === 0) return [];

      const processed: CandlestickData[] = [];
      
      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        const time = new Date(candle.bucket).getTime() / 1000 as Time; // Convert to Unix timestamp
        
        let open = Number(candle.open);
        const close = Number(candle.close);
        let high = Number(candle.high);
        let low = Number(candle.low);

        // Ensure continuity: close of previous = open of current
        if (i > 0 && processed[i - 1]) {
          const prevClose = processed[i - 1].close as number;
          open = prevClose;
          
          // Adjust high/low if needed to ensure they encompass the open
          high = Math.max(high, open);
          low = Math.min(low, open);
        }

        processed.push({
          time,
          open,
          high,
          low,
          close,
        });
      }

      return processed;
    };

    if (history.has_sides && history.buy_candles && history.sell_candles) {
      return {
        buyData: processCandles(history.buy_candles),
        sellData: processCandles(history.sell_candles),
        singleData: [],
      };
    } else if (history.candles) {
      return {
        buyData: [],
        sellData: [],
        singleData: processCandles(history.candles),
      };
    }

    return { buyData: [], sellData: [], singleData: [] };
  }, [history]);

  // Initialize chart (only for single-sided sources)
  useEffect(() => {
    // Skip if two-sided (they use separate components)
    if (history?.has_sides) return;
    
    if (!chartContainerRef.current || isLoading || error) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#334155", style: 1, visible: true },
        horzLines: { color: "#334155", style: 1, visible: true },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isLoading, error, history?.has_sides]);

  // Update chart data (only for single-sided sources)
  useEffect(() => {
    if (!chartRef.current || !processedData || processedData.singleData.length === 0) return;

    const chart = chartRef.current;

    // Clear existing series
    if (singleSeriesRef.current) {
      chart.removeSeries(singleSeriesRef.current);
      singleSeriesRef.current = null;
    }

    // Add single series
    const singleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#26a69a",
    });
    singleSeries.setData(processedData.singleData);
    singleSeriesRef.current = singleSeries;

    // Fit content
    chart.timeScale().fitContent();
  }, [processedData]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div>
          <p className="text-sm text-slate-400">Loading candlestick data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
        <strong className="font-semibold">Error:</strong> Unable to load candlestick data: {error.message}
      </div>
    );
  }

  const hasData = 
    (processedData.buyData.length > 0) || 
    (processedData.sellData.length > 0) || 
    (processedData.singleData.length > 0);

  if (!hasData) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/30">
        <p className="text-sm text-slate-500">No hourly data available yet.</p>
      </div>
    );
  }

  // For two-sided sources, show two separate charts
  if (history?.has_sides && processedData.buyData.length > 0 && processedData.sellData.length > 0) {
    return (
      <div className="space-y-6">
        {/* Buy Price Candlesticks */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-blue-400">💰 Buy Price Candlesticks</h3>
          <BuyChartComponent data={processedData.buyData} />
        </div>

        {/* Sell Price Candlesticks */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-amber-400">💵 Sell Price Candlesticks</h3>
          <SellChartComponent data={processedData.sellData} />
        </div>
      </div>
    );
  }

  // For one-sided sources, show a single candlestick chart
  return (
    <div className="h-96 rounded-lg border border-slate-700/50 bg-slate-900/50 p-2">
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
}

// Separate component for buy chart
function BuyChartComponent({ data }: { data: CandlestickData[] }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const buySeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#334155", style: 1, visible: true },
        horzLines: { color: "#334155", style: 1, visible: true },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    chartRef.current = chart;

    const buySeries = chart.addCandlestickSeries({
      upColor: "#60a5fa",
      downColor: "#ef5350",
      borderUpColor: "#60a5fa",
      borderDownColor: "#ef5350",
      wickUpColor: "#60a5fa",
      wickDownColor: "#60a5fa",
      title: "Buy Price",
    });
    buySeries.setData(data);
    buySeriesRef.current = buySeries;

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="h-80 rounded-lg border border-slate-700/50 bg-slate-900/50 p-2">
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
}

// Separate component for sell chart to avoid ref conflicts
function SellChartComponent({ data }: { data: CandlestickData[] }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const sellSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#334155", style: 1, visible: true },
        horzLines: { color: "#334155", style: 1, visible: true },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    chartRef.current = chart;

    const sellSeries = chart.addCandlestickSeries({
      upColor: "#ffa726",
      downColor: "#ef5350",
      borderUpColor: "#ffa726",
      borderDownColor: "#ef5350",
      wickUpColor: "#ffa726",
      wickDownColor: "#ffa726",
      title: "Sell Price",
    });
    sellSeries.setData(data);
    sellSeriesRef.current = sellSeries;

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="h-80 rounded-lg border border-slate-700/50 bg-slate-900/50 p-2">
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
}
