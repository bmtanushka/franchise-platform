"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { STATUS_LABEL } from "@/lib/lead-status-labels";
import { STATUS_COLOR_VAR } from "./chart-theme";
import type { LeadStatus } from "@/lib/db/leads";

export function StatusChart({ data }: { data: { status: LeadStatus; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: STATUS_LABEL[d.status] }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--grid)" }}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={50}
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
          {chartData.map((d) => (
            <Cell key={d.status} fill={STATUS_COLOR_VAR[d.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
