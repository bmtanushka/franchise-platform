"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatShortDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--grid)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--pipeline-5)", strokeWidth: 1 }}
          contentStyle={{
            background: "var(--chart-surface)",
            border: "1px solid var(--grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--text-secondary)" }}
          itemStyle={{ color: "var(--text-secondary)" }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--pipeline-5)"
          strokeWidth={2}
          fill="var(--pipeline-5)"
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
