import "server-only";

import { db } from "@/server/db/client";
import type { Actor } from "@/server/auth/authorization";
import { assertRole } from "@/server/auth/authorization";
import { AuthorizationError } from "@/server/auth/errors";
import { writeAudit } from "@/server/audit/write-audit";
import { createCoachSchema, uuidSchema } from "@/server/validation/schemas";

export async function createCoach(actor: Actor, rawInput: unknown) {
  assertRole(actor, ["ADMIN"]);
  const input = createCoachSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        timezone: input.timezone,
        role: "COACH",
        status: "INVITED",
        coachProfile: { create: {} },
      },
      include: { coachProfile: true },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "COACH_CREATED",
      entityType: "USER",
      entityId: user.id,
      newValue: { email: user.email, status: user.status, role: user.role },
    });
    return user;
  });
}

export async function setCoachEnabled(
  actor: Actor,
  rawUserId: unknown,
  enabled: boolean,
) {
  assertRole(actor, ["ADMIN"]);
  const userId = uuidSchema.parse(rawUserId);
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: { id: userId, role: "COACH", deletedAt: null },
    });
    if (!existing) throw new AuthorizationError();
    const updated = await tx.user.update({
      where: { id: existing.id },
      data: { status: enabled ? "ACTIVE" : "DISABLED" },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: enabled ? "COACH_ENABLED" : "COACH_DISABLED",
      entityType: "USER",
      entityId: existing.id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });
    return updated;
  });
}

export async function reassignClient(
  actor: Actor,
  rawClientId: unknown,
  rawCoachId: unknown,
) {
  assertRole(actor, ["ADMIN"]);
  const clientId = uuidSchema.parse(rawClientId);
  const coachId = uuidSchema.parse(rawCoachId);
  return db.$transaction(async (tx) => {
    const [client, coach] = await Promise.all([
      tx.clientProfile.findUnique({ where: { id: clientId } }),
      tx.coachProfile.findFirst({
        where: { id: coachId, user: { status: "ACTIVE", deletedAt: null } },
      }),
    ]);
    if (!client || !coach) throw new AuthorizationError();
    if (client.coachId === coach.id) return client;

    await tx.clientCoachHistory.updateMany({
      where: { clientId, endedAt: null },
      data: { endedAt: new Date() },
    });
    const updated = await tx.clientProfile.update({
      where: { id: clientId },
      data: {
        coachId: coach.id,
        ownershipHistory: { create: { coachId: coach.id } },
      },
    });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "CLIENT_REASSIGNED",
      entityType: "CLIENT_PROFILE",
      entityId: clientId,
      oldValue: { coachId: client.coachId },
      newValue: { coachId: coach.id },
    });
    return updated;
  });
}
