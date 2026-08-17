import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  linkClerkUser,
  parseLinkClerkUserArgs,
} from "@/server/admin/link-clerk-user";
import { syncClerkIdentity } from "@/server/auth/sync-clerk-identity";

vi.mock("@/server/auth/sync-clerk-identity", () => ({
  syncClerkIdentity: vi.fn(),
}));

const database = {} as Pick<PrismaClient, "$transaction">;

describe("operator Clerk identity link", () => {
  it("parses and normalizes CLI flags", () => {
    expect(
      parseLinkClerkUserArgs([
        "--email",
        " NoahKnauf@icloud.com ",
        "--clerk-user-id",
        "user_123",
      ]),
    ).toEqual({
      email: "noahknauf@icloud.com",
      clerkUserId: "user_123",
    });
  });

  it("uses the shared verified operator flow", async () => {
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "linked",
      userId: "application-user",
      status: "ACTIVE",
    });
    await linkClerkUser(database, {
      email: "noahknauf@icloud.com",
      clerkUserId: "user_123",
    });
    expect(syncClerkIdentity).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        emailVerified: true,
        source: "operator",
      }),
    );
  });

  it("refuses an unprovisioned email", async () => {
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "not_provisioned",
    });
    await expect(
      linkClerkUser(database, {
        email: "unknown@example.com",
        clerkUserId: "user_123",
      }),
    ).rejects.toThrow("No application user is provisioned");
  });
});
