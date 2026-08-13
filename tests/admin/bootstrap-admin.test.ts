import { describe, expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  bootstrapAdmin,
  parseBootstrapAdminArgs,
} from "@/server/admin/bootstrap-admin";

function databaseWithTransaction(tx: Prisma.TransactionClient) {
  return {
    $transaction: vi.fn(
      async (
        callback: (client: Prisma.TransactionClient) => Promise<unknown>,
      ) => callback(tx),
    ),
  } as unknown as Pick<PrismaClient, "$transaction">;
}

function transaction(overrides?: {
  existing?: {
    id: string;
    email: string;
    role: "ADMIN" | "COACH" | "CLIENT";
    status: "INVITED" | "ACTIVE" | "DISABLED" | "ARCHIVED";
    deletedAt: Date | null;
  } | null;
}) {
  const created = {
    id: "00000000-0000-4000-8000-000000000099",
    email: "admin@example.com",
    role: "ADMIN" as const,
    status: "INVITED" as const,
    deletedAt: null,
  };
  const findUnique = vi.fn().mockResolvedValue(overrides?.existing ?? null);
  const createUser = vi.fn().mockResolvedValue(created);
  const createAudit = vi.fn().mockResolvedValue({ id: "audit-id" });
  const tx = {
    user: { findUnique, create: createUser },
    auditLog: { create: createAudit },
  } as unknown as Prisma.TransactionClient;
  return { tx, findUnique, createUser, createAudit, created };
}

const validInput = {
  email: "admin@example.com",
  firstName: "Avery",
  lastName: "Admin",
  timezone: "America/New_York",
};

describe("admin bootstrap", () => {
  it("parses and normalizes required CLI flags", () => {
    expect(
      parseBootstrapAdminArgs([
        "--email",
        " ADMIN@Example.com ",
        "--first-name",
        " Avery ",
        "--last-name",
        " Admin ",
        "--timezone",
        "America/New_York",
      ]),
    ).toEqual(validInput);
  });

  it.each([
    ["missing email", ["--first-name", "Avery"]],
    [
      "invalid timezone",
      [
        "--email",
        "admin@example.com",
        "--first-name",
        "Avery",
        "--last-name",
        "Admin",
        "--timezone",
        "Mars/Olympus",
      ],
    ],
  ])("rejects %s", (_label, args) => {
    expect(() => parseBootstrapAdminArgs(args)).toThrow();
  });

  it("creates an invited administrator and audit record transactionally", async () => {
    const state = transaction();
    const database = databaseWithTransaction(state.tx);

    await expect(bootstrapAdmin(database, validInput)).resolves.toMatchObject({
      outcome: "created",
      user: state.created,
    });
    expect(state.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: validInput.email,
          role: "ADMIN",
          status: "INVITED",
        }),
      }),
    );
    expect(state.createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ADMIN_BOOTSTRAPPED",
        entityType: "USER",
        entityId: state.created.id,
      }),
    });
  });

  it("is idempotent for an existing non-deleted administrator", async () => {
    const existing = {
      id: "existing-admin",
      email: validInput.email,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      deletedAt: null,
    };
    const state = transaction({ existing });

    await expect(
      bootstrapAdmin(databaseWithTransaction(state.tx), validInput),
    ).resolves.toEqual({ outcome: "existing", user: existing });
    expect(state.createUser).not.toHaveBeenCalled();
    expect(state.createAudit).not.toHaveBeenCalled();
  });

  it.each([
    ["role conflict", { role: "COACH" as const, deletedAt: null }],
    ["deleted user", { role: "ADMIN" as const, deletedAt: new Date() }],
    [
      "archived user",
      { role: "ADMIN" as const, status: "ARCHIVED" as const, deletedAt: null },
    ],
  ])("rejects an existing %s", async (_label, conflict) => {
    const state = transaction({
      existing: {
        id: "conflicting-user",
        email: validInput.email,
        status: "ACTIVE",
        ...conflict,
      },
    });

    await expect(
      bootstrapAdmin(databaseWithTransaction(state.tx), validInput),
    ).rejects.toThrow(/Cannot bootstrap/);
    expect(state.createUser).not.toHaveBeenCalled();
    expect(state.createAudit).not.toHaveBeenCalled();
  });
});
