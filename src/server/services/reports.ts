import "server-only";

import { subDays } from "date-fns";
import { db } from "@/server/db/client";
import type { Actor } from "@/server/auth/authorization";
import { requireCoachProfileId } from "@/server/auth/authorization";
import { requireAccessibleClient } from "@/server/auth/scopes";
import { calculateCompliance, asPercent } from "@/server/domain/compliance";
import { effectiveEventStatus } from "@/server/domain/event-status";
import { calculateWeightTrend } from "@/server/domain/bodyweight";
import { mondayWeekUtcRange } from "@/server/domain/time";
import { localDayKey } from "@/server/domain/time";
import { dailyNoMissedStreak } from "@/server/domain/streaks";

export async function getClientReport(
  actor: Actor,
  options: {
    clientId?: string;
    start: Date;
    end: Date;
    now?: Date;
    weightDays?: number;
  },
) {
  return db.$transaction(async (tx) => {
    const profile = await requireAccessibleClient(tx, actor, options.clientId);
    const now = options.now ?? new Date();
    const [workouts, meals, supplements, bodyMetrics] = await Promise.all([
      tx.workout.findMany({
        where: {
          clientId: profile.id,
          scheduledAt: { gte: options.start, lte: options.end },
        },
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
            include: {
              assignedSets: {
                orderBy: { orderIndex: "asc" },
                include: { log: true },
              },
              setLogs: { where: { isExtra: true } },
            },
          },
          setLogs: true,
        },
        orderBy: { scheduledAt: "asc" },
      }),
      tx.mealEvent.findMany({
        where: {
          clientId: profile.id,
          scheduledAt: { gte: options.start, lte: options.end },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      tx.supplementEvent.findMany({
        where: {
          clientId: profile.id,
          scheduledAt: { gte: options.start, lte: options.end },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      tx.bodyMetric.findMany({
        where: {
          clientId: profile.id,
          measuredAt: {
            gte: subDays(now, options.weightDays ?? 30),
            lte: now,
          },
        },
        orderBy: { measuredAt: "asc" },
      }),
    ]);

    const workoutInputs = workouts.map((workout) => {
      const assigned = workout.exercises.flatMap((item) => item.assignedSets);
      return {
        expectedAssignedSets: assigned.length,
        completedAssignedSets: assigned.filter(
          (set) => set.log?.status === "COMPLETED",
        ).length,
        status: effectiveEventStatus({
          kind: "workout",
          scheduledAt: workout.scheduledAt,
          now,
          completedAt: workout.finalizedAt,
        }),
      };
    });
    const mealInputs = meals.map((meal) => ({
      status: effectiveEventStatus({
        kind: "meal" as const,
        scheduledAt: meal.scheduledAt,
        now,
        completedAt: meal.completedAt,
      }),
    }));
    const supplementInputs = supplements.map((supplement) => ({
      status: effectiveEventStatus({
        kind: "supplement" as const,
        scheduledAt: supplement.scheduledAt,
        now,
        completedAt: supplement.completedAt,
      }),
    }));
    const compliance = calculateCompliance({
      workouts: workoutInputs,
      meals: mealInputs,
      supplements: supplementInputs,
    });
    const statusesByDay = new Map<
      string,
      (typeof mealInputs)[number]["status"][]
    >();
    const allEvents = [
      ...workouts.map((event, index) => ({
        at: event.scheduledAt,
        status: workoutInputs[index]?.status ?? "SCHEDULED",
      })),
      ...meals.map((event, index) => ({
        at: event.scheduledAt,
        status: mealInputs[index]?.status ?? "SCHEDULED",
      })),
      ...supplements.map((event, index) => ({
        at: event.scheduledAt,
        status: supplementInputs[index]?.status ?? "SCHEDULED",
      })),
    ];
    const currentDay = localDayKey(now, profile.user.timezone);
    for (const event of allEvents) {
      const day = localDayKey(event.at, profile.user.timezone);
      if (day > currentDay) continue;
      statusesByDay.set(day, [...(statusesByDay.get(day) ?? []), event.status]);
    }
    const dailyStreak = dailyNoMissedStreak(
      [...statusesByDay.entries()]
        .toSorted(([a], [b]) => b.localeCompare(a))
        .map(([, statuses]) => statuses),
    );
    const weightTrend = calculateWeightTrend(
      bodyMetrics.map((metric) => ({
        id: metric.id,
        value: Number(metric.value),
        unit: metric.unit,
        measuredAt: metric.measuredAt,
        isMorning: metric.isMorning,
      })),
      profile.user.timezone,
    );

    return {
      profile,
      workouts: workouts.map((workout, index) => ({
        ...workout,
        effectiveStatus: workoutInputs[index]?.status ?? "SCHEDULED",
      })),
      meals: meals.map((meal, index) => ({
        ...meal,
        effectiveStatus: mealInputs[index]?.status ?? "SCHEDULED",
      })),
      supplements: supplements.map((supplement, index) => ({
        ...supplement,
        effectiveStatus: supplementInputs[index]?.status ?? "SCHEDULED",
      })),
      compliance,
      compliancePercent: {
        workout: asPercent(compliance.workout.rate),
        meal: asPercent(compliance.meal.rate),
        supplement: asPercent(compliance.supplement.rate),
        overall: asPercent(compliance.overall),
      },
      dailyStreak,
      weightTrend,
    };
  });
}

export async function getCurrentWeekReport(
  actor: Actor,
  clientId?: string,
  now = new Date(),
  weightDays = 30,
) {
  const timezone = await db.$transaction(async (tx) => {
    const client = await requireAccessibleClient(tx, actor, clientId);
    return client.user.timezone;
  });
  const range = mondayWeekUtcRange(now, timezone);
  const report = await getClientReport(actor, {
    clientId,
    ...range,
    now,
    weightDays,
  });
  return { ...report, range };
}

export async function getCoachOverview(actor: Actor, now = new Date()) {
  const coachId = requireCoachProfileId(actor);
  const clients = await db.clientProfile.findMany({
    where: { coachId, user: { deletedAt: null } },
    include: { user: true },
    orderBy: { user: { lastName: "asc" } },
  });
  return Promise.all(
    clients.map(async (client) => {
      const range = mondayWeekUtcRange(now, client.user.timezone);
      const report = await getClientReport(actor, {
        clientId: client.id,
        ...range,
        now,
        weightDays: 30,
      });
      return { client, report };
    }),
  );
}
