export type EventKind = "workout" | "meal" | "supplement";
export type EffectiveEventStatus =
  "SCHEDULED" | "COMPLETED" | "OVERDUE" | "MISSED";

const GRACE_PERIOD_MS: Record<EventKind, number> = {
  workout: 24 * 60 * 60 * 1000,
  meal: 12 * 60 * 60 * 1000,
  supplement: 12 * 60 * 60 * 1000,
};

export function effectiveEventStatus(input: {
  kind: EventKind;
  scheduledAt: Date;
  now: Date;
  completedAt?: Date | null;
}): EffectiveEventStatus {
  if (input.completedAt) return "COMPLETED";

  const elapsed = input.now.getTime() - input.scheduledAt.getTime();
  if (elapsed <= 0) return "SCHEDULED";
  if (elapsed <= GRACE_PERIOD_MS[input.kind]) return "OVERDUE";
  return "MISSED";
}

export function gracePeriodMs(kind: EventKind): number {
  return GRACE_PERIOD_MS[kind];
}
