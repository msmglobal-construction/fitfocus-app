import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stats } from "../types";
import { formatNumber } from "../utils";

interface VolumeChartProps {
  data: Stats["weeklyVolume"];
}

export function VolumeChart({ data }: VolumeChartProps) {
  const hasData = data.some((d) => d.volume > 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-white">Weekly Volume</h2>
        <span className="text-xs text-slate-500">Last 7 days · lbs lifted</span>
      </div>
      <div className="h-64 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => formatNumber(Number(v))}
              />
              <Tooltip
                cursor={{ fill: "rgba(125,198,34,0.12)" }}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  color: "#f1f5f9",
                }}
                formatter={(v) => [`${formatNumber(Number(v))} lbs`, "Volume"]}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={entry.volume > 0 ? "#7dc622" : "#1e293b"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No volume logged in the last 7 days. Add a workout to get started.
          </div>
        )}
      </div>
    </div>
  );
}
