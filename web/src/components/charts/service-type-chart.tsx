"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORICAL_VARS } from "./chart-theme";

export function ServiceTypeChart({
  data,
}: {
  data: { serviceTypeKey: string; serviceTypeLabel: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="serviceTypeLabel"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--grid)" }}
          tickLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={55}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--grid)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--chart-surface)",
            border: "1px solid var(--grid)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--text-secondary)" }}
          itemStyle={{ color: "var(--text-secondary)" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
          {data.map((d, i) => (
            <Cell key={d.serviceTypeKey} fill={CATEGORICAL_VARS[i % CATEGORICAL_VARS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
