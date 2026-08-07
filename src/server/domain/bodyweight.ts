import { localDayKey } from "./time";

export interface WeightEntry {
  id: string;
  value: number;
  unit: "LB" | "KG";
  measuredAt: Date;
  isMorning: boolean;
}

export interface WeightTrend {
  points: WeightEntry[];
  latest: WeightEntry | null;
  change: number | null;
  ratePerWeek: number | null;
}

export function selectDailyWeights(
  entries: readonly WeightEntry[],
  timezone: string,
): WeightEntry[] {
  const byDay = new Map<string, WeightEntry[]>();
  for (const entry of entries) {
    const key = localDayKey(entry.measuredAt, timezone);
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }

  return [...byDay.values()]
    .map((day) => {
      const sorted = day.toSorted(
        (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime(),
      );
      return sorted.find((entry) => entry.isMorning) ?? sorted[0];
    })
    .filter((entry): entry is WeightEntry => Boolean(entry))
    .toSorted((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
}

export function calculateWeightTrend(
  entries: readonly WeightEntry[],
  timezone: string,
): WeightTrend {
  const points = selectDailyWeights(entries, timezone);
  const first = points[0];
  const latest = points.at(-1) ?? null;
  if (
    !first ||
    !latest ||
    first.unit !== latest.unit ||
    first.id === latest.id
  ) {
    return { points, latest, change: null, ratePerWeek: null };
  }

  const change = latest.value - first.value;
  const elapsedWeeks =
    (latest.measuredAt.getTime() - first.measuredAt.getTime()) /
    (7 * 24 * 60 * 60 * 1000);
  return {
    points,
    latest,
    change,
    ratePerWeek: elapsedWeeks > 0 ? change / elapsedWeeks : null,
  };
}
