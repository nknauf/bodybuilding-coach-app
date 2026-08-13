import type { EffectiveEventStatus } from "./event-status";

export type ComplianceCategory = "workout" | "meal" | "supplement";

export interface WorkoutComplianceEvent {
  expectedAssignedSets: number;
  completedAssignedSets: number;
  status: EffectiveEventStatus;
}

export interface CompletionEvent {
  status: EffectiveEventStatus;
}

export interface CategoryCompliance {
  completed: number;
  expected: number;
  rate: number | null;
}

export interface ComplianceResult {
  workout: CategoryCompliance;
  meal: CategoryCompliance;
  supplement: CategoryCompliance;
  overall: number | null;
}

const WEIGHTS: Record<ComplianceCategory, number> = {
  workout: 0.5,
  meal: 0.35,
  supplement: 0.15,
};

function ratio(completed: number, expected: number): CategoryCompliance {
  return {
    completed,
    expected,
    rate: expected === 0 ? null : Math.min(1, completed / expected),
  };
}

export function calculateCompliance(input: {
  workouts?: readonly WorkoutComplianceEvent[];
  meals?: readonly CompletionEvent[];
  supplements?: readonly CompletionEvent[];
}): ComplianceResult {
  const workouts = input.workouts ?? [];
  const meals = input.meals ?? [];
  const supplements = input.supplements ?? [];

  const workout = ratio(
    workouts.reduce(
      (total, event) =>
        total +
        Math.min(event.completedAssignedSets, event.expectedAssignedSets),
      0,
    ),
    workouts.reduce((total, event) => total + event.expectedAssignedSets, 0),
  );
  const meal = ratio(
    meals.filter((event) => event.status === "COMPLETED").length,
    meals.length,
  );
  const supplement = ratio(
    supplements.filter((event) => event.status === "COMPLETED").length,
    supplements.length,
  );

  const categories = { workout, meal, supplement };
  const applicable = (
    Object.entries(categories) as [ComplianceCategory, CategoryCompliance][]
  ).filter(([, value]) => value.rate !== null);
  const applicableWeight = applicable.reduce(
    (sum, [category]) => sum + WEIGHTS[category],
    0,
  );
  const overall =
    applicableWeight === 0
      ? null
      : applicable.reduce(
          (sum, [category, value]) =>
            sum + (value.rate ?? 0) * WEIGHTS[category],
          0,
        ) / applicableWeight;

  return { workout, meal, supplement, overall };
}

export function asPercent(rate: number | null): number | null {
  return rate === null ? null : Math.round(rate * 1000) / 10;
}
