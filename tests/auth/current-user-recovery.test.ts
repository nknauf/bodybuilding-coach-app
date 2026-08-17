import { describe, expect, it, vi } from "vitest";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db/client";
import { syncClerkIdentity } from "@/server/auth/sync-clerk-identity";
import { resolveCurrentActor } from "@/server/auth/current-user";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({
  db: { user: { findUnique: vi.fn() } },
}));
vi.mock("@/server/auth/sync-clerk-identity", () => ({
  syncClerkIdentity: vi.fn(),
}));

describe("current actor recovery", () => {
  it("links a verified pre-provisioned identity when its webhook was missed", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "clerk-user",
    } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user",
      firstName: null,
      lastName: null,
      publicMetadata: {},
      primaryEmailAddress: {
        emailAddress: "noahknauf@icloud.com",
        verification: { status: "verified" },
      },
    } as unknown as Awaited<ReturnType<typeof currentUser>>);
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "linked",
      userId: "application-user",
      status: "ACTIVE",
    });
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "application-user",
        clerkUserId: "clerk-user",
        role: "ADMIN",
        status: "ACTIVE",
        timezone: "America/New_York",
        deletedAt: null,
        coachProfile: null,
        clientProfile: null,
      } as never);

    await expect(resolveCurrentActor()).resolves.toEqual({
      kind: "active",
      actor: {
        id: "application-user",
        clerkUserId: "clerk-user",
        role: "ADMIN",
        status: "ACTIVE",
        timezone: "America/New_York",
        coachProfileId: null,
        clientProfileId: null,
      },
    });
    expect(syncClerkIdentity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: "noahknauf@icloud.com",
        emailVerified: true,
        source: "session_recovery",
      }),
    );
  });
});
