import { beforeEach, describe, expect, it, vi } from "vitest";
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

const activeRecord = {
  id: "00000000-0000-4000-8000-000000000012",
  clerkUserId: "user_fixture_current",
  role: "CLIENT",
  status: "ACTIVE",
  timezone: "UTC",
  deletedAt: null,
  coachProfile: null,
  clientProfile: { id: "fixture-client" },
};

function sessionWithEmail(verified = true) {
  vi.mocked(auth).mockResolvedValue({
    userId: activeRecord.clerkUserId,
  } as Awaited<ReturnType<typeof auth>>);
  vi.mocked(currentUser).mockResolvedValue({
    id: activeRecord.clerkUserId,
    firstName: null,
    lastName: null,
    publicMetadata: {},
    primaryEmailAddress: {
      emailAddress: "client@identity.example.test",
      verification: { status: verified ? "verified" : "unverified" },
    },
  } as unknown as Awaited<ReturnType<typeof currentUser>>);
}

describe("current actor recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not recover a signed-out session", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);
    await expect(resolveCurrentActor()).resolves.toEqual({
      kind: "signed_out",
    });
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(syncClerkIdentity).not.toHaveBeenCalled();
  });

  it("rejects unverified recovery before synchronization", async () => {
    sessionWithEmail(false);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    await expect(resolveCurrentActor()).resolves.toEqual({
      kind: "email_unverified",
    });
    expect(syncClerkIdentity).not.toHaveBeenCalled();
  });

  it.each([
    ["identity_email_collision", "not_provisioned"],
    ["invitation_metadata_mismatch", "not_provisioned"],
    ["email_unverified", "email_unverified"],
    ["account_unavailable", "unavailable"],
  ] as const)("does not grant an actor after %s", async (reason, kind) => {
    sessionWithEmail();
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "rejected",
      reason,
    });
    await expect(resolveCurrentActor()).resolves.toEqual({ kind });
    expect(db.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it("does not grant an unknown signup an actor", async () => {
    sessionWithEmail();
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "not_provisioned",
    });
    await expect(resolveCurrentActor()).resolves.toEqual({
      kind: "not_provisioned",
    });
  });

  it.each([
    ["disabled", { status: "DISABLED" }],
    ["archived", { status: "ARCHIVED" }],
    ["deleted", { deletedAt: new Date("2026-01-01T00:00:00Z") }],
  ])(
    "denies an already-linked %s account without recovery",
    async (_label, override) => {
      sessionWithEmail();
      vi.mocked(db.user.findUnique).mockResolvedValue({
        ...activeRecord,
        ...override,
      } as never);
      await expect(resolveCurrentActor()).resolves.toEqual({
        kind: "unavailable",
      });
      expect(currentUser).not.toHaveBeenCalled();
      expect(syncClerkIdentity).not.toHaveBeenCalled();
    },
  );

  it("rechecks availability after successful synchronization", async () => {
    sessionWithEmail();
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...activeRecord, status: "DISABLED" } as never);
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "linked",
      userId: activeRecord.id,
      status: "DISABLED",
    });
    await expect(resolveCurrentActor()).resolves.toEqual({
      kind: "unavailable",
    });
  });

  it("does not invent an actor when the post-sync lookup is empty", async () => {
    sessionWithEmail();
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "linked",
      userId: activeRecord.id,
      status: "ACTIVE",
    });
    await expect(resolveCurrentActor()).resolves.toEqual({
      kind: "not_provisioned",
    });
  });
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
        emailAddress: "admin@identity.example.test",
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
        email: "admin@identity.example.test",
        emailVerified: true,
        source: "session_recovery",
      }),
    );
  });
});
