import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "./authorization";
import {
  assertClientAccess,
  requireClientProfileId,
  requireCoachProfileId,
} from "./authorization";
import { AuthorizationError } from "./errors";

type DbClient = Prisma.TransactionClient;
type ClientWithUser = Prisma.ClientProfileGetPayload<{
  include: { user: true };
}>;

export function clientScopeWhere(
  actor: Actor,
  requestedClientId?: string,
): Prisma.ClientProfileWhereInput {
  if (actor.role === "COACH") {
    return {
      id: requestedClientId,
      coachId: requireCoachProfileId(actor),
      status: { in: ["ACTIVE", "INACTIVE", "INVITED"] },
      user: { deletedAt: null },
    };
  }
  if (actor.role === "CLIENT") {
    return {
      id: requestedClientId ?? requireClientProfileId(actor),
      userId: actor.id,
      user: { deletedAt: null },
    };
  }
  return { id: requestedClientId, user: { deletedAt: null } };
}

export async function findAccessibleClient(
  client: DbClient,
  actor: Actor,
  requestedClientId?: string,
): Promise<ClientWithUser | null> {
  return client.clientProfile.findFirst({
    where: clientScopeWhere(actor, requestedClientId),
    include: { user: true },
  });
}

export async function requireAccessibleClient(
  client: DbClient,
  actor: Actor,
  requestedClientId?: string,
) {
  const profile = await findAccessibleClient(client, actor, requestedClientId);
  if (!profile) throw new AuthorizationError();
  assertClientAccess(actor, profile);
  return profile;
}
