import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { addDays, subHours } from "date-fns";
import { db } from "@/server/db/client";
import type { Actor } from "@/server/auth/authorization";
import { assertRole, requireCoachProfileId } from "@/server/auth/authorization";
import { AuthorizationError } from "@/server/auth/errors";
import { requireAccessibleClient } from "@/server/auth/scopes";
import { writeAudit } from "@/server/audit/write-audit";
import { localDateTimeToUtc } from "@/server/domain/time";
import {
  createClientSchema,
  exerciseSchema,
  mealSchema,
  supplementSchema,
  uuidSchema,
  workoutSchema,
} from "@/server/validation/schemas";

export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export async function provisionClient(actor: Actor, rawInput: unknown) {
  const coachId = requireCoachProfileId(actor);
  const input = createClientSchema.parse(rawInput);
  const recentInvites = await db.auditLog.count({
    where: {
      actorUserId: actor.id,
      action: "CLIENT_INVITED",
      createdAt: { gte: subHours(new Date(), 1) },
    },
  });
  if (recentInvites >= 20) {
    throw new Error("Invitation limit reached. Try again later.");
  }
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        timezone: input.timezone,
        role: "CLIENT",
        status: "INVITED",
        clientProfile: {
          create: {
            coachId,
            status: "INVITED",
            ownershipHistory: { create: { coachId } },
          },
        },
      },
      include: { clientProfile: true },
    });
    const invite = await tx.clientInvite.create({
      data: {
        coachId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        timezone: input.timezone,
        tokenHash,
        expiresAt: addDays(new Date(), 7),
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "CLIENT_INVITED",
      entityType: "CLIENT_INVITE",
      entityId: invite.id,
      newValue: {
        email: invite.email,
        clientId: user.clientProfile?.id,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
    return { user, invite };
  });
  return { ...result, developmentToken: token };
}

export async function setClientStatus(
  actor: Actor,
  rawClientId: unknown,
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED",
) {
  const clientId = uuidSchema.parse(rawClientId);
  return db.$transaction(async (tx) => {
    const client = await requireAccessibleClient(tx, actor, clientId);
    const updated = await tx.clientProfile.update({
      where: { id: client.id },
      data: {
        status,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
        user:
          status === "ARCHIVED"
            ? { update: { status: "ARCHIVED" } }
            : undefined,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "CLIENT_STATUS_CHANGED",
      entityType: "CLIENT_PROFILE",
      entityId: client.id,
      oldValue: { status: client.status },
      newValue: { status },
    });
    return updated;
  });
}

export async function createCoachExercise(actor: Actor, rawInput: unknown) {
  const coachId = requireCoachProfileId(actor);
  const input = exerciseSchema.parse(rawInput);
  const normalizedName = normalizeExerciseName(input.name);
  return db.$transaction(async (tx) => {
    const exercise = await tx.exercise.create({
      data: {
        ...input,
        name: input.name.trim().replace(/\s+/g, " "),
        normalizedName,
        scope: "COACH",
        ownerCoachId: coachId,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "EXERCISE_CREATED",
      entityType: "EXERCISE",
      entityId: exercise.id,
      newValue: { name: exercise.name, scope: exercise.scope },
    });
    return exercise;
  });
}

export async function scheduleWorkout(actor: Actor, rawInput: unknown) {
  const coachId = requireCoachProfileId(actor);
  const input = workoutSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const client = await requireAccessibleClient(tx, actor, input.clientId);
    const scheduledAt = localDateTimeToUtc(
      input.scheduledAt,
      client.user.timezone,
    );
    const exerciseIds = input.exercises.map((item) => item.exerciseId);
    const exercises = await tx.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        isActive: true,
        OR: [{ scope: "GLOBAL" }, { scope: "COACH", ownerCoachId: coachId }],
      },
    });
    const exerciseById = new Map(exercises.map((item) => [item.id, item]));
    if (exerciseById.size !== new Set(exerciseIds).size)
      throw new AuthorizationError();

    const workout = await tx.workout.create({
      data: {
        coachId,
        clientId: client.id,
        name: input.name,
        notes: input.notes,
        durationMinutes: input.durationMinutes,
        scheduledAt,
        originalScheduledAt: scheduledAt,
        scheduleTimezone: client.user.timezone,
        exercises: {
          create: input.exercises.map((item, orderIndex) => {
            const exercise = exerciseById.get(item.exerciseId);
            if (!exercise) throw new AuthorizationError();
            return {
              exerciseId: exercise.id,
              exerciseNameSnapshot: exercise.name,
              orderIndex,
              coachNotes: item.notes,
              assignedSets: {
                create: item.expectedReps.map((expectedReps, setIndex) => ({
                  orderIndex: setIndex,
                  expectedReps,
                })),
              },
            };
          }),
        },
      },
      include: { exercises: { include: { assignedSets: true } } },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "WORKOUT_SCHEDULED",
      entityType: "WORKOUT",
      entityId: workout.id,
      newValue: {
        clientId: client.id,
        scheduledAt: workout.scheduledAt.toISOString(),
        expectedSets: workout.exercises.reduce(
          (sum, item) => sum + item.assignedSets.length,
          0,
        ),
      },
    });
    return workout;
  });
}

export async function scheduleMeal(actor: Actor, rawInput: unknown) {
  const coachId = requireCoachProfileId(actor);
  const input = mealSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const client = await requireAccessibleClient(tx, actor, input.clientId);
    const scheduledAt = localDateTimeToUtc(
      input.scheduledAt,
      client.user.timezone,
    );
    const meal = await tx.mealEvent.create({
      data: {
        ...input,
        scheduledAt,
        coachId,
        clientId: client.id,
        originalScheduledAt: scheduledAt,
        scheduleTimezone: client.user.timezone,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "MEAL_SCHEDULED",
      entityType: "MEAL_EVENT",
      entityId: meal.id,
      newValue: {
        clientId: client.id,
        scheduledAt: meal.scheduledAt.toISOString(),
      },
    });
    return meal;
  });
}

export async function scheduleSupplement(actor: Actor, rawInput: unknown) {
  const coachId = requireCoachProfileId(actor);
  const input = supplementSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const client = await requireAccessibleClient(tx, actor, input.clientId);
    const scheduledAt = localDateTimeToUtc(
      input.scheduledAt,
      client.user.timezone,
    );
    const supplement = await tx.supplementEvent.create({
      data: {
        ...input,
        scheduledAt,
        coachId,
        clientId: client.id,
        originalScheduledAt: scheduledAt,
        scheduleTimezone: client.user.timezone,
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "SUPPLEMENT_SCHEDULED",
      entityType: "SUPPLEMENT_EVENT",
      entityId: supplement.id,
      newValue: {
        clientId: client.id,
        scheduledAt: supplement.scheduledAt.toISOString(),
      },
    });
    return supplement;
  });
}

export async function listCoachClients(actor: Actor) {
  assertRole(actor, ["COACH"]);
  return db.clientProfile.findMany({
    where: {
      coachId: requireCoachProfileId(actor),
      user: { deletedAt: null },
    },
    include: { user: true },
    orderBy: { user: { lastName: "asc" } },
  });
}
