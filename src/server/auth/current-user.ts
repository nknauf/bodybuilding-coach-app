import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { db } from "@/server/db/client";
import type { Role } from "@/generated/prisma/client";
import type { Actor } from "./authorization";
import {
  AccountUnavailableError,
  AuthenticationError,
  AuthorizationError,
} from "./errors";

export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  if (!session.userId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: session.userId },
    select: {
      id: true,
      clerkUserId: true,
      role: true,
      status: true,
      timezone: true,
      deletedAt: true,
      coachProfile: { select: { id: true } },
      clientProfile: { select: { id: true } },
    },
  });
  if (!user) return null;
  if (user.deletedAt || user.status !== "ACTIVE") {
    throw new AccountUnavailableError();
  }
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    role: user.role,
    status: user.status,
    timezone: user.timezone,
    coachProfileId: user.coachProfile?.id ?? null,
    clientProfileId: user.clientProfile?.id ?? null,
  };
});

export async function requireActor(allowed?: readonly Role[]): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) throw new AuthenticationError();
  if (allowed && !allowed.includes(actor.role)) throw new AuthorizationError();
  return actor;
}
