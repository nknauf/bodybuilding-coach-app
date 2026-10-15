import { describe, expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { syncClerkIdentity } from "@/server/auth/sync-clerk-identity";

type ExistingUser = {
  id: string;
  clerkUserId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "COACH" | "CLIENT";
  status: "INVITED" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  deletedAt: Date | null;
  clientProfile: { id: string; joinedAt: Date | null } | null;
};

const invitedAdmin: ExistingUser = {
  id: "00000000-0000-4000-8000-000000000012",
  clerkUserId: null,
  email: "admin@identity.example.test",
  firstName: "Fixture",
  lastName: "Admin",
  role: "ADMIN",
  status: "INVITED",
  deletedAt: null,
  clientProfile: null,
};

const identity = {
  clerkUserId: "user_fixture_new",
  email: "admin@identity.example.test",
  emailVerified: true,
  firstName: null,
  lastName: null,
  applicationUserId: null,
  source: "webhook" as const,
};

function harness({
  byClerkId = null,
  byEmail = invitedAdmin,
}: {
  byClerkId?: ExistingUser | null;
  byEmail?: ExistingUser | null;
} = {}) {
  const findUnique = vi
    .fn()
    .mockResolvedValueOnce(byClerkId)
    .mockResolvedValueOnce(byEmail);
  const updateUser = vi.fn().mockResolvedValue({});
  const createAudit = vi.fn().mockResolvedValue({});
  const updateClient = vi.fn().mockResolvedValue({});
  const updateInvites = vi.fn().mockResolvedValue({ count: 0 });
  const tx = {
    user: { findUnique, update: updateUser },
    auditLog: { create: createAudit },
    clientProfile: { update: updateClient },
    clientInvite: { updateMany: updateInvites },
  } as unknown as Prisma.TransactionClient;
  const transaction = vi.fn(
    async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(tx),
  );
  const database = {
    $transaction: transaction,
  } as unknown as Pick<PrismaClient, "$transaction">;
  return {
    database,
    transaction,
    updateUser,
    createAudit,
    updateClient,
    updateInvites,
  };
}

describe("Clerk identity synchronization", () => {
  it("activates the supplied verified user.created payload with null names", async () => {
    const state = harness();
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "linked",
      userId: invitedAdmin.id,
      status: "ACTIVE",
    });
    expect(state.updateUser).toHaveBeenCalledWith({
      where: { id: invitedAdmin.id },
      data: expect.objectContaining({
        clerkUserId: identity.clerkUserId,
        firstName: "Fixture",
        lastName: "Admin",
        status: "ACTIVE",
      }),
    });
    expect(state.createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CLERK_USER_ACTIVATED" }),
    });
    expect(state.transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 20_000,
      timeout: 20_000,
    });
  });

  it("is idempotent when a retry arrives for an active linked user", async () => {
    const active = {
      ...invitedAdmin,
      clerkUserId: identity.clerkUserId,
      status: "ACTIVE" as const,
    };
    const state = harness({ byClerkId: active, byEmail: active });
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "already_linked",
      userId: active.id,
      status: "ACTIVE",
    });
    expect(state.updateUser).toHaveBeenCalledWith({
      where: { id: active.id },
      data: {
        clerkUserId: active.clerkUserId,
        email: active.email,
        firstName: active.firstName,
        lastName: active.lastName,
        status: "ACTIVE",
      },
    });
    expect(state.updateClient).not.toHaveBeenCalled();
    expect(state.updateInvites).not.toHaveBeenCalled();
  });

  it("never provisions an unknown public signup", async () => {
    const state = harness({ byEmail: null });
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "not_provisioned",
    });
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ["unverified email", { emailVerified: false }, "email_unverified"],
    [
      "metadata mismatch",
      { applicationUserId: "00000000-0000-4000-8000-000000000099" },
      "invitation_metadata_mismatch",
    ],
  ])("rejects %s", async (_label, override, reason) => {
    const state = harness();
    await expect(
      syncClerkIdentity(state.database, { ...identity, ...override }),
    ).resolves.toMatchObject({ outcome: "rejected", reason });
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(state.updateClient).not.toHaveBeenCalled();
    expect(state.updateInvites).not.toHaveBeenCalled();
  });

  it("rejects an identity collision", async () => {
    const other = {
      ...invitedAdmin,
      id: "00000000-0000-4000-8000-000000000099",
      email: "other@example.com",
      clerkUserId: identity.clerkUserId,
      status: "ACTIVE" as const,
    };
    const state = harness({ byClerkId: other });
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "rejected",
      reason: "identity_email_collision",
      userId: other.id,
    });
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(state.updateClient).not.toHaveBeenCalled();
    expect(state.updateInvites).not.toHaveBeenCalled();
  });

  // T06 evidence only, not an approved replacement policy. T07 must replace
  // this characterization with the owner's chosen deny/allow invariant.
  it.each(["webhook", "session_recovery", "operator"] as const)(
    "characterizes the existing same-email replacement gap via %s",
    async (source) => {
      const existing = {
        ...invitedAdmin,
        status: "ACTIVE" as const,
        clerkUserId: "user_fixture_original",
      };
      const state = harness({ byEmail: existing });
      await expect(
        syncClerkIdentity(state.database, { ...identity, source }),
      ).resolves.toEqual({
        outcome: "linked",
        userId: existing.id,
        status: "ACTIVE",
      });
      expect(state.updateUser).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: expect.objectContaining({ clerkUserId: identity.clerkUserId }),
      });
      expect(state.updateClient).not.toHaveBeenCalled();
      expect(state.updateInvites).not.toHaveBeenCalled();
    },
  );

  it("characterizes same-ID verified email updates without changing role or ownership", async () => {
    const existing = {
      ...invitedAdmin,
      status: "ACTIVE" as const,
      clerkUserId: identity.clerkUserId,
    };
    const state = harness({ byClerkId: existing, byEmail: null });
    await expect(
      syncClerkIdentity(state.database, {
        ...identity,
        email: "changed@identity.example.test",
      }),
    ).resolves.toMatchObject({
      outcome: "already_linked",
      userId: existing.id,
    });
    const data = state.updateUser.mock.calls[0][0].data;
    expect(data.email).toBe("changed@identity.example.test");
    expect(data).not.toHaveProperty("role");
    expect(data).not.toHaveProperty("coachProfile");
    expect(data).not.toHaveProperty("clientProfile");
    expect(state.updateClient).not.toHaveBeenCalled();
    expect(state.updateInvites).not.toHaveBeenCalled();
  });

  it.each([
    ["archived", { status: "ARCHIVED" as const }],
    ["deleted", { deletedAt: new Date("2026-01-01T00:00:00Z") }],
  ])("rejects an %s application account", async (_label, override) => {
    const existing = { ...invitedAdmin, ...override };
    const state = harness({ byEmail: existing });
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "rejected",
      reason: "account_unavailable",
      userId: existing.id,
    });
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(state.updateClient).not.toHaveBeenCalled();
    expect(state.updateInvites).not.toHaveBeenCalled();
  });

  it("links but does not activate a disabled account", async () => {
    const disabled = { ...invitedAdmin, status: "DISABLED" as const };
    const state = harness({ byEmail: disabled });
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "linked",
      userId: disabled.id,
      status: "DISABLED",
    });
    expect(state.updateUser).toHaveBeenCalledWith({
      where: { id: disabled.id },
      data: expect.objectContaining({ status: "DISABLED" }),
    });
  });

  it("activates client profile and invitation with the user", async () => {
    const client = {
      ...invitedAdmin,
      role: "CLIENT" as const,
      clientProfile: { id: "client-id", joinedAt: null },
    };
    const state = harness({ byEmail: client });
    await syncClerkIdentity(state.database, identity);
    expect(state.updateClient).toHaveBeenCalled();
    expect(state.updateInvites).toHaveBeenCalled();
  });
});
