"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function WeightChart({
  points,
}: {
  points: { date: string; value: number }[];
}) {
  if (points.length < 2) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Add at least two daily weights to see a trend.
      </p>
    );
  }
  const chartPoints = points.map((point, index) => {
    const window = points.slice(Math.max(0, index - 6), index + 1);
    return {
      ...point,
      trend: window.reduce((sum, item) => sum + item.value, 0) / window.length,
    };
  });
  return (
    <div className="h-64 w-full" aria-label="Bodyweight trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartPoints}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis domain={["dataMin - 2", "dataMax + 2"]} width={42} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#a1a1aa"
            strokeWidth={1}
            dot={{ r: 2, fill: "#a1a1aa" }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="7-day average"
            stroke="var(--color-primary)"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
