import { describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/server/auth/authorization";
import { requireAccessibleClient } from "@/server/auth/scopes";

const coachA: Actor = {
  id: "user-a",
  clerkUserId: "clerk-a",
  role: "COACH",
  status: "ACTIVE",
  timezone: "UTC",
  coachProfileId: "coach-a",
  clientProfileId: null,
};

function fakeTransaction() {
  const coachBClient = {
    id: "client-b",
    userId: "client-user-b",
    coachId: "coach-b",
    status: "ACTIVE" as const,
    joinedAt: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "client-user-b",
      clerkUserId: null,
      email: "b@example.test",
      firstName: "B",
      lastName: "Client",
      role: "CLIENT" as const,
      status: "ACTIVE" as const,
      timezone: "UTC",
      lastSignedInAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  };
  return {
    clientProfile: {
      findFirst: async ({
        where,
      }: {
        where: { id?: string; coachId?: string };
      }) =>
        where.id === coachBClient.id && where.coachId === coachBClient.coachId
          ? coachBClient
          : null,
    },
  } as unknown as Prisma.TransactionClient;
}

describe("cross-tenant guard used by coach workflows", () => {
  it.each([
    "client detail read",
    "client status mutation",
    "workout scheduling",
    "meal scheduling",
    "supplement scheduling",
  ])("Coach A cannot perform %s with Coach B's client ID", async () => {
    await expect(
      requireAccessibleClient(fakeTransaction(), coachA, "client-b"),
    ).rejects.toThrow("Resource not found");
  });
});
