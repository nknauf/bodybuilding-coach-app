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
  return (
    <div className="h-64 w-full" aria-label="Bodyweight trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis domain={["dataMin - 2", "dataMax + 2"]} width={42} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
