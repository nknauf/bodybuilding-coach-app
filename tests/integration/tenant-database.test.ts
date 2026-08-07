import { randomUUID } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

if (process.env.RUN_DATABASE_TESTS === "1") {
  config({ path: ".env.local", quiet: true });
}
const databaseUrl = process.env.DATABASE_URL;
const runDatabaseTests =
  process.env.RUN_DATABASE_TESTS === "1" && Boolean(databaseUrl);
const prisma = runDatabaseTests
  ? new PrismaClient({
      adapter: new PrismaNeon({ connectionString: databaseUrl }),
    })
  : null;

afterAll(async () => {
  await prisma?.$disconnect();
});

describe.skipIf(!runDatabaseTests)("Neon tenant constraints", () => {
  const coachA = "10000000-0000-4000-8000-000000000001";
  const clientB = "20000000-0000-4000-8000-000000000002";

  it("a Coach A scoped query cannot retrieve Coach B's seeded client", async () => {
    const result = await prisma?.clientProfile.findFirst({
      where: { id: clientB, coachId: coachA },
    });
    expect(result).toBeNull();
  });

  it("the composite event foreign key rejects a cross-tenant mutation", async () => {
    await expect(
      prisma?.mealEvent.create({
        data: {
          id: randomUUID(),
          coachId: coachA,
          clientId: clientB,
          name: "Must not persist",
          originalScheduledAt: new Date("2026-08-03T12:00:00.000Z"),
          scheduledAt: new Date("2026-08-03T12:00:00.000Z"),
          scheduleTimezone: "UTC",
        },
      }),
    ).rejects.toThrow();
  });
});
