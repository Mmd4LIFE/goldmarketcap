import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

import { MinuteHistoryResponse } from "../lib/api";

interface MinuteChartProps {
  history: MinuteHistoryResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function MinuteChart({ history, isLoading, error }: MinuteChartProps) {
  const data = useMemo(() => {
    if (!history) {
      return [];
    }
    return history.points.map((point) => {
      const base: any = {
        time: new Date(point.bucket).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      
      if (history.has_sides) {
        // Two-sided: show buy and sell
        if (point.buy_price) base.buy = Number(point.buy_price);
        if (point.sell_price) base.sell = Number(point.sell_price);
      } else {
        // One-sided: show average
        if (point.average_price) base.price = Number(point.average_price);
      }
      
      return base;
    });
  }, [history]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div>
          <p className="text-sm text-slate-400">Loading minute data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
        <strong className="font-semibold">Error:</strong> Unable to load minute data: {error.message}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/30">
        <p className="text-sm text-slate-500">No minute data available yet.</p>
      </div>
    );
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            tick={{ fill: "#94a3b8", fontSize: 11 }} 
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fill: "#94a3b8", fontSize: 11 }} 
            domain={['auto', 'auto']}
            scale="linear"
            tickFormatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f1f5f9",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
            }}
            formatter={(value: any) => [
              Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }),
              ""
            ]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "10px" }}
            iconType="line"
          />
          {history?.has_sides ? (
            <>
              <Line 
                type="monotone" 
                dataKey="buy" 
                stroke="#60a5fa" 
                dot={false} 
                strokeWidth={2.5} 
                name="Buy Price"
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="sell" 
                stroke="#fbbf24" 
                dot={false} 
                strokeWidth={2.5} 
                name="Sell Price"
                connectNulls
              />
            </>
          ) : (
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#34d399" 
              dot={false} 
              strokeWidth={3} 
              name="Price"
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

