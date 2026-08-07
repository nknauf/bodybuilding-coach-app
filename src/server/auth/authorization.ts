import type { Role, UserStatus } from "@/generated/prisma/client";
import { AccountUnavailableError, AuthorizationError } from "./errors";

export interface Actor {
  id: string;
  clerkUserId: string | null;
  role: Role;
  status: UserStatus;
  timezone: string;
  coachProfileId: string | null;
  clientProfileId: string | null;
}

export function assertActive(actor: Actor): void {
  if (actor.status !== "ACTIVE") throw new AccountUnavailableError();
}

export function assertRole(actor: Actor, allowed: readonly Role[]): void {
  assertActive(actor);
  if (!allowed.includes(actor.role)) throw new AuthorizationError();
}

export function requireCoachProfileId(actor: Actor): string {
  assertRole(actor, ["COACH"]);
  if (!actor.coachProfileId) throw new AuthorizationError();
  return actor.coachProfileId;
}

export function requireClientProfileId(actor: Actor): string {
  assertRole(actor, ["CLIENT"]);
  if (!actor.clientProfileId) throw new AuthorizationError();
  return actor.clientProfileId;
}

export function canAccessClient(
  actor: Actor,
  client: { id: string; userId: string; coachId: string | null },
): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "COACH")
    return Boolean(
      actor.coachProfileId && actor.coachProfileId === client.coachId,
    );
  return Boolean(actor.clientProfileId && actor.clientProfileId === client.id);
}

export function assertClientAccess(
  actor: Actor,
  client: { id: string; userId: string; coachId: string | null },
): void {
  assertActive(actor);
  if (!canAccessClient(actor, client)) throw new AuthorizationError();
}
