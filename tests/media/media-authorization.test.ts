import { describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/server/auth/authorization";
import { requireAccessibleClient } from "@/server/auth/scopes";

const base: Actor = {
  id: "user",
  clerkUserId: "clerk",
  role: "CLIENT",
  status: "ACTIVE",
  timezone: "UTC",
  clientProfileId: "own-client",
  coachProfileId: null,
};
const client = {
  id: "own-client",
  userId: "user",
  coachId: "assigned-coach",
  user: { deletedAt: null },
};
const db = {
  clientProfile: {
    findFirst: async ({
      where,
    }: {
      where: { id: string; userId?: string; coachId?: string };
    }) =>
      where.id === client.id &&
      (where.userId === client.userId || where.coachId === client.coachId)
        ? client
        : null,
  },
} as unknown as Prisma.TransactionClient;

describe("media uses the shared client scope", () => {
  it("allows a client to access their own media", async () => {
    await expect(
      requireAccessibleClient(db, base, "own-client"),
    ).resolves.toMatchObject({ id: "own-client" });
  });
  it("rejects another client's ID", async () => {
    await expect(
      requireAccessibleClient(db, base, "other-client"),
    ).rejects.toThrow("Resource not found");
  });
  it("allows the assigned coach", async () => {
    await expect(
      requireAccessibleClient(
        db,
        {
          ...base,
          role: "COACH",
          clientProfileId: null,
          coachProfileId: "assigned-coach",
        },
        "own-client",
      ),
    ).resolves.toMatchObject({ id: "own-client" });
  });
  it("rejects an arbitrary coach", async () => {
    await expect(
      requireAccessibleClient(
        db,
        {
          ...base,
          role: "COACH",
          clientProfileId: null,
          coachProfileId: "another-coach",
        },
        "own-client",
      ),
    ).rejects.toThrow("Resource not found");
  });
});
