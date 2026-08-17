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
  id: "58f28c0d-7124-4765-bdf4-8beeb670ea32",
  clerkUserId: null,
  email: "noahknauf@icloud.com",
  firstName: "Noah",
  lastName: "Knauf",
  role: "ADMIN",
  status: "INVITED",
  deletedAt: null,
  clientProfile: null,
};

const identity = {
  clerkUserId: "user_3I151qQfx1H6kNt42lUvtLHdUvT",
  email: "noahknauf@icloud.com",
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
        firstName: "Noah",
        lastName: "Knauf",
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
  });

  it.each([
    ["archived", { status: "ARCHIVED" as const }],
    ["deleted", { deletedAt: new Date() }],
  ])("rejects an %s application account", async (_label, override) => {
    const existing = { ...invitedAdmin, ...override };
    const state = harness({ byEmail: existing });
    await expect(syncClerkIdentity(state.database, identity)).resolves.toEqual({
      outcome: "rejected",
      reason: "account_unavailable",
      userId: existing.id,
    });
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
