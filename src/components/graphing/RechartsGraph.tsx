"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface ChartSpec {
  type: "bar" | "line" | "pie" | "area";
  title?: string;
  data: ChartDataPoint[];
  categories?: string[];
  xKey?: string;
  colors?: string[];
  height?: number;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff7300",
];

function BarChartView({ spec }: { spec: ChartSpec }) {
  const xKey = spec.xKey || "name";
  const categories = spec.categories || spec.data.length > 0
    ? Object.keys(spec.data[0]).filter((k) => k !== xKey)
    : [];

  return (
    <ResponsiveContainer width="100%" height={spec.height || 300}>
      <BarChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey={xKey} className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border)/0.5)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend />
        {categories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            fill={spec.colors?.[i] || COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ spec }: { spec: ChartSpec }) {
  const xKey = spec.xKey || "name";
  const categories = spec.categories || spec.data.length > 0
    ? Object.keys(spec.data[0]).filter((k) => k !== xKey)
    : [];

  return (
    <ResponsiveContainer width="100%" height={spec.height || 300}>
      <LineChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey={xKey} className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border)/0.5)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend />
        {categories.map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={spec.colors?.[i] || COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ spec }: { spec: ChartSpec }) {
  const dataKey = spec.categories?.[0] || "value";
  const nameKey = spec.xKey || "name";

  const pieData = spec.data.map((d) => ({
    name: d[nameKey] as string,
    value: d[dataKey] as number,
  }));

  return (
    <ResponsiveContainer width="100%" height={spec.height || 300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={spec.colors?.[index] || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border)/0.5)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function AreaChartView({ spec }: { spec: ChartSpec }) {
  const xKey = spec.xKey || "name";
  const categories = spec.categories || spec.data.length > 0
    ? Object.keys(spec.data[0]).filter((k) => k !== xKey)
    : [];

  return (
    <ResponsiveContainer width="100%" height={spec.height || 300}>
      <AreaChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey={xKey} className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border)/0.5)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend />
        {categories.map((cat, i) => (
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={spec.colors?.[i] || COLORS[i % COLORS.length]}
            fill={spec.colors?.[i] || COLORS[i % COLORS.length]}
            fillOpacity={0.3}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface RechartsGraphProps {
  spec: ChartSpec;
  className?: string;
}

export default function RechartsGraph({ spec, className }: RechartsGraphProps) {
  const chart = useMemo(() => {
    switch (spec.type) {
      case "bar":
        return <BarChartView spec={spec} />;
      case "line":
        return <LineChartView spec={spec} />;
      case "pie":
        return <PieChartView spec={spec} />;
      case "area":
        return <AreaChartView spec={spec} />;
      default:
        return <BarChartView spec={spec} />;
    }
  }, [spec]);

  return (
    <div className={cn("my-4 rounded-2xl overflow-hidden border border-border/30 bg-muted/20 p-4", className)}>
      {spec.title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">{spec.title}</h3>
      )}
      {chart}
    </div>
  );
}
