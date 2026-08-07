import type { ComplianceResult } from "./compliance";
import type { EffectiveEventStatus } from "./event-status";

export function consecutiveCompletedEventStreak(
  statusesNewestFirst: readonly EffectiveEventStatus[],
): number {
  let count = 0;
  for (const status of statusesNewestFirst) {
    if (status !== "COMPLETED") break;
    count += 1;
  }
  return count;
}

export function weeklyComplianceStreak(
  weeklyRatesNewestFirst: readonly (number | null)[],
): number {
  let count = 0;
  for (const rate of weeklyRatesNewestFirst) {
    if (rate === null || rate < 0.9) break;
    count += 1;
  }
  return count;
}

export function dailyNoMissedStreak(
  daysNewestFirst: readonly (readonly EffectiveEventStatus[])[],
): number {
  let count = 0;
  for (const statuses of daysNewestFirst) {
    if (statuses.length === 0) continue;
    if (statuses.some((status) => status === "MISSED")) break;
    count += 1;
  }
  return count;
}

export function overallDailyStreak(
  daysNewestFirst: readonly ComplianceResult[],
): number {
  let count = 0;
  for (const day of daysNewestFirst) {
    const rates = [day.workout.rate, day.meal.rate, day.supplement.rate].filter(
      (rate): rate is number => rate !== null,
    );
    if (rates.length === 0) continue;
    if (rates.some((rate) => rate < 0.8)) break;
    count += 1;
  }
  return count;
}
