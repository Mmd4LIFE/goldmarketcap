import { useMemo } from "react";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar, Cell } from "recharts";

import { HourCandleResponse, HourCandlePoint } from "../lib/api";

interface CandlestickChartProps {
  history: HourCandleResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

interface CandleData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  isGreen: boolean;
  type: "buy" | "sell" | "default";
  // For rendering
  mid: number; // (high + low) / 2 for bar positioning
  range: number; // high - low for bar height
  bodyTop: number;
  bodyBottom: number;
  bodyHeight: number;
  domainMin?: number;
  domainMax?: number;
}

// Professional Candlestick Shape - CoinMarketCap style
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  if (!payload) return null;
  
  const { open, close, high, low, isGreen, type, domainMin, domainMax } = payload;
  
  // Determine colors - professional style
  let bodyColor: string;
  let wickColor: string;
  
  if (type === "buy") {
    bodyColor = isGreen ? "#26a69a" : "#ef5350";
    wickColor = isGreen ? "#26a69a" : "#ef5350";
  } else if (type === "sell") {
    bodyColor = isGreen ? "#ffa726" : "#ef5350";
    wickColor = isGreen ? "#ffa726" : "#ef5350";
  } else {
    bodyColor = isGreen ? "#26a69a" : "#ef5350";
    wickColor = isGreen ? "#26a69a" : "#ef5350";
  }
  
  // When using dataKey="high", the bar renders from domainMin to high
  // y is the top of the bar (at high position)
  // y + height would be the bottom (at domainMin)
  // We need to calculate where low, open, and close are
  
  // The bar height represents the range from domainMin to high
  // We need to find where low is relative to this
  // Since we don't have direct access to domainMin, we'll use the fact that
  // the bar represents the full range, and calculate positions based on the data values
  
  // Actually, let's use a simpler approach: the bar height is proportional to (high - domainMin)
  // But we can calculate positions using the ratio of (high - value) / (high - domainMin)
  // Since we don't know domainMin, we'll approximate using the bar height
  
  // Better approach: use the Y-axis scale if available, or calculate relative to the bar
  // For now, let's assume the bar represents the range and calculate positions
  
  const range = high - low;
  if (range === 0) return null;
  
  // The bar goes from some base (likely domainMin) to high
  // We'll calculate positions assuming the bar represents the full visible range
  // Calculate where each value should be relative to the bar
  
  // Get the Y-axis domain from the chart context if possible
  // For now, we'll use a workaround: calculate positions based on the assumption
  // that the bar represents the range from (high - some estimate) to high
  
  // Actually, the simplest approach: use the bar's y and height to calculate
  // If the bar represents high at y, and we know the range, we can estimate positions
  // But we need to know where the domain starts
  
  // Let's use a different approach: calculate positions based on the ratio
  // If high is at y (top of bar), and the bar height represents the distance,
  // we can calculate where low should be
  
  // Estimate: if the bar height represents (high - domainMin), and we want to find low,
  // low should be at: y + (height * (high - low) / (high - domainMin))
  // But we don't know domainMin...
  
  // Simpler: assume the bar represents the range we care about and calculate relative positions
  // We'll use the range (high - low) and calculate positions within that
  
  // Calculate positions relative to high (which is at y, the top of the bar)
  // We'll estimate where low is based on the bar height and the data range
  // This is an approximation, but should work reasonably well
  
  // Get an estimate of the domain range from the bar height
  // The bar height in pixels represents some price range
  // We'll use the ratio of price ranges to pixel positions
  
  // Calculate positions using the domain
  // When using dataKey="high", the bar renders from domainMin (bottom) to high (top)
  // y is the top of the bar (at high), y + height is the bottom (at domainMin)
  // So: valueY = y + (height * (high - value) / (high - domainMin))
  const domainBase = domainMin !== undefined ? domainMin : 0;
  const barRange = high - domainBase; // The range the bar represents
  
  // Calculate Y positions (in SVG, y increases downward)
  const lowY = y + (height * (high - low) / barRange);
  const openY = y + (height * (high - open) / barRange);
  const closeY = y + (height * (high - close) / barRange);
  
  const bodyTopY = Math.min(openY, closeY);
  const bodyBottomY = Math.max(openY, closeY);
  const bodyHeightPx = Math.max(2, Math.abs(closeY - openY));
  
  const candleWidth = Math.max(4, width * 0.5);
  const candleX = x + (width - candleWidth) / 2;
  const centerX = x + width / 2;
  
  return (
    <g>
      {/* Upper wick (from high to body top) */}
      {openY < y || closeY < y ? (
        <line
          x1={centerX}
          y1={y}
          x2={centerX}
          y2={bodyTopY}
          stroke={wickColor}
          strokeWidth={1.5}
          opacity={0.9}
        />
      ) : null}
      
      {/* Lower wick (from body bottom to low) */}
      {openY > lowY || closeY > lowY ? (
        <line
          x1={centerX}
          y1={bodyBottomY}
          x2={centerX}
          y2={lowY}
          stroke={wickColor}
          strokeWidth={1.5}
          opacity={0.9}
        />
      ) : null}
      
      {/* Candlestick body */}
      <rect
        x={candleX}
        y={bodyTopY}
        width={candleWidth}
        height={bodyHeightPx}
        fill={bodyColor}
        stroke={bodyColor}
        strokeWidth={0.5}
        rx={0.5}
        opacity={isGreen ? 0.95 : 0.9}
      />
    </g>
  );
};

export function CandlestickChart({ history, isLoading, error }: CandlestickChartProps) {
  const { buyData, sellData, singleData, allData } = useMemo(() => {
    if (!history) {
      return { buyData: [], sellData: [], singleData: [], allData: [] };
    }

    const formatCandles = (candles: HourCandlePoint[], type: "buy" | "sell" | "default", domainMin: number, domainMax: number): CandleData[] => {
      return candles.map((candle) => {
        const open = Number(candle.open);
        const close = Number(candle.close);
        const high = Number(candle.high);
        const low = Number(candle.low);
        const isGreen = close >= open;
        const range = high - low;
        
        return {
          time: new Date(candle.bucket).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
          }),
          open,
          close,
          high,
          low,
          isGreen,
          type,
          mid: (high + low) / 2,
          range: range || 1,
          bodyTop: Math.min(open, close),
          bodyBottom: Math.max(open, close),
          bodyHeight: Math.abs(close - open),
          domainMin,
          domainMax,
        };
      });
    };

    // Calculate domain first
    const allValues = (history.has_sides && history.buy_candles && history.sell_candles)
      ? [...history.buy_candles, ...history.sell_candles].flatMap(c => [Number(c.high), Number(c.low)])
      : (history.candles ? history.candles.flatMap(c => [Number(c.high), Number(c.low)]) : []);
    
    const domainMin = allValues.length > 0 ? Math.min(...allValues) * 0.95 : 0;
    const domainMax = allValues.length > 0 ? Math.max(...allValues) * 1.05 : 1000;

    if (history.has_sides && history.buy_candles && history.sell_candles) {
      const buy = formatCandles(history.buy_candles, "buy", domainMin, domainMax);
      const sell = formatCandles(history.sell_candles, "sell", domainMin, domainMax);
      return {
        buyData: buy,
        sellData: sell,
        singleData: [],
        allData: [...buy, ...sell],
      };
    } else if (history.candles) {
      const single = formatCandles(history.candles, "default", domainMin, domainMax);
      return {
        buyData: [],
        sellData: [],
        singleData: single,
        allData: single,
      };
    }

    return { buyData: [], sellData: [], singleData: [], allData: [] };
  }, [history]);

  // Calculate Y-axis domain dynamically
  const yDomain = useMemo(() => {
    if (allData.length === 0) return ['auto', 'auto'];
    const allValues = allData.flatMap(d => [d.high, d.low]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.05;
    return [Math.max(0, min - padding), max + padding];
  }, [allData]);

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

  const hasData = buyData.length > 0 || sellData.length > 0 || singleData.length > 0;

  if (!hasData) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/30">
        <p className="text-sm text-slate-500">No hourly data available yet.</p>
      </div>
    );
  }

  // Professional tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      const change = data.close - data.open;
      const changePercent = data.open > 0 ? ((change / data.open) * 100).toFixed(2) : "0.00";
      const isPositive = change >= 0;
      
      return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur-sm p-3 shadow-2xl">
          <p className="mb-2 text-xs font-semibold text-slate-300">{data.time}</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Open:</span>
              <span className="font-semibold text-slate-100">{Number(data.open).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">High:</span>
              <span className="font-semibold text-emerald-400">{Number(data.high).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Low:</span>
              <span className="font-semibold text-red-400">{Number(data.low).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Close:</span>
              <span className="font-semibold text-slate-100">{Number(data.close).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-slate-700 pt-1.5">
              <span className="text-slate-400">Change:</span>
              <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Render chart function
  const renderChart = (data: CandleData[], title?: string, color?: string) => {
    // Transform data for Bar component - we need bars that span from low to high
    // Recharts Bar doesn't support this directly, so we'll use a workaround:
    // Use low as the base value, and render the full range in the shape
    const barData = data.map(d => ({
      ...d,
      // For the bar, we'll use the range as the "value" but position it at low
      // Actually, let's use a different approach: create a bar that represents the range
      barValue: d.range, // This will be the height
      barBase: d.low,   // This will be the base
    }));

    return (
      <div className={title ? "space-y-3" : ""}>
        {title && (
          <h3 className={`text-sm font-semibold ${color || "text-slate-300"}`}>
            {title}
          </h3>
        )}
        <div className={title ? "h-80" : "h-96"}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={data} 
              margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis 
                dataKey="time" 
                tick={{ fill: "#94a3b8", fontSize: 11 }} 
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                domain={yDomain}
                tickFormatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Use high as the dataKey - the bar will render from 0 to high */}
              {/* In the shape, we calculate where low, open, and close are relative to high */}
              <Bar 
                dataKey="high" 
                fill="transparent"
                shape={<CandlestickShape />}
                minPointSize={1}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // For two-sided sources
  if (history?.has_sides && buyData.length > 0 && sellData.length > 0) {
    return (
      <div className="space-y-6">
        {renderChart(buyData, "💰 Buy Price", "text-blue-400")}
        {renderChart(sellData, "💵 Sell Price", "text-amber-400")}
      </div>
    );
  }

  // For one-sided sources
  return renderChart(singleData);
}
