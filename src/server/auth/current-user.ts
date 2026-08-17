import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/server/db/client";
import type { Role } from "@/generated/prisma/client";
import type { Actor } from "./authorization";
import {
  AccountUnavailableError,
  AuthenticationError,
  AuthorizationError,
} from "./errors";
import { syncClerkIdentity } from "./sync-clerk-identity";

const actorSelect = {
  id: true,
  clerkUserId: true,
  role: true,
  status: true,
  timezone: true,
  deletedAt: true,
  email: true,
  coachProfile: { select: { id: true } },
  clientProfile: { select: { id: true } },
} as const;

async function findActorRecord(clerkUserId: string) {
  return db.user.findUnique({ where: { clerkUserId }, select: actorSelect });
}

function toActor(
  user: NonNullable<Awaited<ReturnType<typeof findActorRecord>>>,
): Actor {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    role: user.role,
    status: user.status,
    timezone: user.timezone,
    coachProfileId: user.coachProfile?.id ?? null,
    clientProfileId: user.clientProfile?.id ?? null,
  };
}

export type ActorResolution =
  | { kind: "active"; actor: Actor }
  | { kind: "signed_out" }
  | { kind: "not_provisioned" }
  | { kind: "email_unverified" }
  | { kind: "unavailable" };

export const resolveCurrentActor = cache(async (): Promise<ActorResolution> => {
  const session = await auth();
  if (!session.userId) return { kind: "signed_out" };

  let user = await findActorRecord(session.userId);
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return { kind: "signed_out" };
    const primary = clerkUser.primaryEmailAddress;
    if (!primary) return { kind: "not_provisioned" };
    if (primary.verification?.status !== "verified") {
      return { kind: "email_unverified" };
    }

    const metadataUserId =
      typeof clerkUser.publicMetadata?.applicationUserId === "string"
        ? clerkUser.publicMetadata.applicationUserId
        : null;
    const result = await syncClerkIdentity(db, {
      clerkUserId: clerkUser.id,
      email: primary.emailAddress,
      emailVerified: true,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      applicationUserId: metadataUserId,
      source: "session_recovery",
    });
    console.info("clerk_session_identity_recovery", {
      outcome: result.outcome,
      ...("reason" in result ? { reason: result.reason } : {}),
    });
    if (result.outcome === "not_provisioned") {
      return { kind: "not_provisioned" };
    }
    if (result.outcome === "rejected") {
      return result.reason === "email_unverified"
        ? { kind: "email_unverified" }
        : result.reason === "account_unavailable"
          ? { kind: "unavailable" }
          : { kind: "not_provisioned" };
    }
    user = await findActorRecord(session.userId);
  }

  if (!user) return { kind: "not_provisioned" };
  if (user.deletedAt || user.status !== "ACTIVE") {
    return { kind: "unavailable" };
  }
  return { kind: "active", actor: toActor(user) };
});

export async function getCurrentActor(): Promise<Actor | null> {
  const resolution = await resolveCurrentActor();
  if (resolution.kind === "active") return resolution.actor;
  if (resolution.kind === "unavailable") {
    throw new AccountUnavailableError();
  }
  return null;
}

export async function requireActor(allowed?: readonly Role[]): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) throw new AuthenticationError();
  if (allowed && !allowed.includes(actor.role)) throw new AuthorizationError();
  return actor;
}

export async function requirePageActor(
  allowed: readonly Role[],
): Promise<Actor> {
  const resolution = await resolveCurrentActor();
  if (resolution.kind === "signed_out") redirect("/sign-in");
  if (resolution.kind !== "active") redirect("/app");
  if (!allowed.includes(resolution.actor.role)) redirect("/app");
  return resolution.actor;
}
