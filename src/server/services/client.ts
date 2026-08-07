import "server-only";

import { db } from "@/server/db/client";
import type { Actor } from "@/server/auth/authorization";
import { requireClientProfileId } from "@/server/auth/authorization";
import { AuthorizationError } from "@/server/auth/errors";
import { writeAudit } from "@/server/audit/write-audit";
import { localDateTimeToUtc } from "@/server/domain/time";
import {
  bodyMetricSchema,
  completeMealSchema,
  extraSetSchema,
  setLogSchema,
  rescheduleSchema,
  uuidSchema,
  workoutNotesSchema,
} from "@/server/validation/schemas";
import { effectiveEventStatus } from "@/server/domain/event-status";

export async function logAssignedSet(actor: Actor, rawInput: unknown) {
  const clientId = requireClientProfileId(actor);
  const input = setLogSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const assigned = await tx.assignedSet.findFirst({
      where: {
        id: input.assignedSetId,
        workoutExercise: {
          workout: {
            id: input.workoutId,
            clientId,
            finalizedAt: null,
            client: { userId: actor.id },
          },
        },
      },
      include: { workoutExercise: true },
    });
    if (!assigned) throw new AuthorizationError();
    const log = await tx.workoutSetLog.upsert({
      where: { assignedSetId: assigned.id },
      update: {
        status: input.status,
        actualReps: input.actualReps,
        actualWeight: input.actualWeight,
        weightUnit: input.weightUnit,
      },
      create: {
        workoutId: input.workoutId,
        workoutExerciseId: assigned.workoutExerciseId,
        assignedSetId: assigned.id,
        clientId,
        status: input.status,
        actualReps: input.actualReps,
        actualWeight: input.actualWeight,
        weightUnit: input.weightUnit,
        isExtra: false,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "WORKOUT_SET_LOGGED",
      entityType: "WORKOUT_SET_LOG",
      entityId: log.id,
      newValue: {
        assignedSetId: assigned.id,
        status: log.status,
        actualReps: log.actualReps,
      },
    });
    return log;
  });
}

export async function logExtraSet(actor: Actor, rawInput: unknown) {
  const clientId = requireClientProfileId(actor);
  const input = extraSetSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const item = await tx.workoutExercise.findFirst({
      where: {
        id: input.workoutExerciseId,
        workout: {
          id: input.workoutId,
          clientId,
          finalizedAt: null,
          client: { userId: actor.id },
        },
      },
    });
    if (!item) throw new AuthorizationError();
    const log = await tx.workoutSetLog.create({
      data: {
        workoutId: input.workoutId,
        workoutExerciseId: item.id,
        clientId,
        status: "COMPLETED",
        actualReps: input.actualReps,
        actualWeight: input.actualWeight,
        weightUnit: input.weightUnit,
        isExtra: true,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "EXTRA_WORKOUT_SET_LOGGED",
      entityType: "WORKOUT_SET_LOG",
      entityId: log.id,
      newValue: { workoutExerciseId: item.id, isExtra: true },
    });
    return log;
  });
}

export async function removeExtraSet(actor: Actor, rawSetLogId: unknown) {
  const clientId = requireClientProfileId(actor);
  const setLogId = uuidSchema.parse(rawSetLogId);
  return db.$transaction(async (tx) => {
    const log = await tx.workoutSetLog.findFirst({
      where: {
        id: setLogId,
        clientId,
        isExtra: true,
        workout: { finalizedAt: null, client: { userId: actor.id } },
      },
    });
    if (!log) throw new AuthorizationError();
    await tx.workoutSetLog.delete({ where: { id: log.id } });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "EXTRA_WORKOUT_SET_REMOVED",
      entityType: "WORKOUT_SET_LOG",
      entityId: log.id,
      oldValue: { workoutId: log.workoutId, isExtra: true },
    });
  });
}

export async function finalizeWorkout(actor: Actor, rawWorkoutId: unknown) {
  const clientId = requireClientProfileId(actor);
  const workoutId = uuidSchema.parse(rawWorkoutId);
  return db.$transaction(async (tx) => {
    const workout = await tx.workout.findFirst({
      where: {
        id: workoutId,
        clientId,
        client: { userId: actor.id },
        finalizedAt: null,
      },
      include: { _count: { select: { setLogs: true } } },
    });
    if (!workout) throw new AuthorizationError();
    if (workout._count.setLogs < 1)
      throw new Error("At least one set must be logged before finalizing.");
    const updated = await tx.workout.update({
      where: { id: workout.id },
      data: {
        finalizedAt: new Date(),
        storedStatus: "COMPLETED",
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "WORKOUT_FINALIZED",
      entityType: "WORKOUT",
      entityId: workout.id,
      newValue: { finalizedAt: updated.finalizedAt?.toISOString() },
    });
    return updated;
  });
}

export async function completeMeal(actor: Actor, rawInput: unknown) {
  const clientId = requireClientProfileId(actor);
  const input = completeMealSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const meal = await tx.mealEvent.findFirst({
      where: { id: input.mealId, clientId, client: { userId: actor.id } },
    });
    if (!meal) throw new AuthorizationError();
    if (meal.completedAt) return meal;
    const updated = await tx.mealEvent.update({
      where: { id: meal.id },
      data: {
        actualCalories: input.actualCalories,
        actualProteinGrams: input.actualProteinGrams,
        actualCarbGrams: input.actualCarbGrams,
        actualFatGrams: input.actualFatGrams,
        completedAt: new Date(),
        storedStatus: "COMPLETED",
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "MEAL_COMPLETED",
      entityType: "MEAL_EVENT",
      entityId: meal.id,
      newValue: { completedAt: updated.completedAt?.toISOString() },
    });
    return updated;
  });
}

export async function completeSupplement(
  actor: Actor,
  rawSupplementId: unknown,
) {
  const clientId = requireClientProfileId(actor);
  const supplementId = uuidSchema.parse(rawSupplementId);
  return db.$transaction(async (tx) => {
    const supplement = await tx.supplementEvent.findFirst({
      where: { id: supplementId, clientId, client: { userId: actor.id } },
    });
    if (!supplement) throw new AuthorizationError();
    if (supplement.completedAt) return supplement;
    const updated = await tx.supplementEvent.update({
      where: { id: supplement.id },
      data: { completedAt: new Date(), storedStatus: "COMPLETED" },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "SUPPLEMENT_COMPLETED",
      entityType: "SUPPLEMENT_EVENT",
      entityId: supplement.id,
      newValue: { completedAt: updated.completedAt?.toISOString() },
    });
    return updated;
  });
}

export async function logBodyweight(actor: Actor, rawInput: unknown) {
  const clientId = requireClientProfileId(actor);
  const input = bodyMetricSchema.parse(rawInput);
  const measuredAt = localDateTimeToUtc(input.measuredAt, actor.timezone);
  return db.$transaction(async (tx) => {
    const metric = await tx.bodyMetric.create({
      data: {
        clientId,
        creatorId: actor.id,
        value: input.value,
        unit: input.unit,
        measuredAt,
        isMorning: input.isMorning,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "BODYWEIGHT_LOGGED",
      entityType: "BODY_METRIC",
      entityId: metric.id,
      newValue: {
        value: metric.value.toString(),
        unit: metric.unit,
        measuredAt: metric.measuredAt.toISOString(),
      },
    });
    return metric;
  });
}

export async function getClientWorkout(actor: Actor, rawWorkoutId: unknown) {
  const clientId = requireClientProfileId(actor);
  const workoutId = uuidSchema.parse(rawWorkoutId);
  const workout = await db.workout.findFirst({
    where: {
      id: workoutId,
      clientId,
      client: { userId: actor.id },
    },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: {
          assignedSets: {
            orderBy: { orderIndex: "asc" },
            include: { log: true },
          },
          setLogs: {
            where: { isExtra: true },
            orderBy: { loggedAt: "asc" },
          },
        },
      },
    },
  });
  if (!workout) throw new AuthorizationError();
  return workout;
}

export async function rescheduleEvent(actor: Actor, rawInput: unknown) {
  const clientId = requireClientProfileId(actor);
  const input = rescheduleSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const baseWhere = {
      id: input.eventId,
      clientId,
      movedByClient: false,
      client: { userId: actor.id },
    };
    const event =
      input.kind === "WORKOUT"
        ? await tx.workout.findFirst({ where: baseWhere })
        : input.kind === "MEAL"
          ? await tx.mealEvent.findFirst({ where: baseWhere })
          : await tx.supplementEvent.findFirst({ where: baseWhere });
    if (!event) throw new AuthorizationError();
    const kind = input.kind.toLowerCase() as "workout" | "meal" | "supplement";
    const completedAt =
      input.kind === "WORKOUT"
        ? "finalizedAt" in event
          ? event.finalizedAt
          : null
        : "completedAt" in event
          ? event.completedAt
          : null;
    const currentStatus = effectiveEventStatus({
      kind,
      scheduledAt: event.scheduledAt,
      now: new Date(),
      completedAt,
    });
    if (currentStatus === "COMPLETED" || currentStatus === "MISSED") {
      throw new Error("Completed or missed events cannot be moved.");
    }
    const scheduledAt = localDateTimeToUtc(
      input.scheduledAt,
      event.scheduleTimezone,
    );
    if (input.kind === "WORKOUT") {
      await tx.workout.update({
        where: { id: event.id },
        data: { scheduledAt, movedByClient: true, storedStatus: "SCHEDULED" },
      });
    } else if (input.kind === "MEAL") {
      await tx.mealEvent.update({
        where: { id: event.id },
        data: { scheduledAt, movedByClient: true, storedStatus: "SCHEDULED" },
      });
    } else {
      await tx.supplementEvent.update({
        where: { id: event.id },
        data: { scheduledAt, movedByClient: true, storedStatus: "SCHEDULED" },
      });
    }
    await tx.eventReschedule.create({
      data: {
        kind: input.kind,
        eventId: event.id,
        actorUserId: actor.id,
        fromTime: event.scheduledAt,
        toTime: scheduledAt,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "EVENT_RESCHEDULED",
      entityType: `${input.kind}_EVENT`,
      entityId: event.id,
      oldValue: { scheduledAt: event.scheduledAt.toISOString() },
      newValue: { scheduledAt: scheduledAt.toISOString() },
    });
    return { id: event.id, scheduledAt };
  });
}

export async function saveWorkoutNotes(actor: Actor, rawInput: unknown) {
  const clientId = requireClientProfileId(actor);
  const input = workoutNotesSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const workout = await tx.workout.findFirst({
      where: {
        id: input.workoutId,
        clientId,
        client: { userId: actor.id },
        finalizedAt: null,
      },
    });
    if (!workout) throw new AuthorizationError();
    if (input.exerciseId) {
      const updated = await tx.workoutExercise.updateMany({
        where: { id: input.exerciseId, workoutId: workout.id },
        data: { clientNotes: input.exerciseNotes },
      });
      if (updated.count !== 1) throw new AuthorizationError();
    }
    await tx.workout.update({
      where: { id: workout.id },
      data: { clientNotes: input.workoutNotes },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "WORKOUT_NOTES_UPDATED",
      entityType: "WORKOUT",
      entityId: workout.id,
      newValue: {
        hasWorkoutNote: Boolean(input.workoutNotes),
        exerciseId: input.exerciseId,
        hasExerciseNote: Boolean(input.exerciseNotes),
      },
    });
  });
}
