import { parseArgs } from "node:util";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

const bootstrapAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email())
    .transform((value) => value.toLowerCase()),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  timezone: z
    .string()
    .min(1)
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid IANA timezone"),
});

export type BootstrapAdminInput = z.infer<typeof bootstrapAdminSchema>;

export function parseBootstrapAdminArgs(args: string[]): BootstrapAdminInput {
  const { values } = parseArgs({
    args,
    options: {
      email: { type: "string" },
      "first-name": { type: "string" },
      "last-name": { type: "string" },
      timezone: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
  });

  return bootstrapAdminSchema.parse({
    email: values.email,
    firstName: values["first-name"],
    lastName: values["last-name"],
    timezone: values.timezone,
  });
}

export async function bootstrapAdmin(
  database: Pick<PrismaClient, "$transaction">,
  rawInput: unknown,
) {
  const input = bootstrapAdminSchema.parse(rawInput);

  return database.$transaction(
    async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          deletedAt: true,
        },
      });

      if (existing) {
        if (existing.deletedAt || existing.status === "ARCHIVED") {
          throw new Error(
            `Cannot bootstrap ${input.email}: the existing user is deleted or archived.`,
          );
        }
        if (existing.role !== "ADMIN") {
          throw new Error(
            `Cannot bootstrap ${input.email}: the email belongs to a ${existing.role.toLowerCase()} account.`,
          );
        }
        return { outcome: "existing" as const, user: existing };
      }

      const user = await tx.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          timezone: input.timezone,
          role: "ADMIN",
          status: "INVITED",
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          deletedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "ADMIN_BOOTSTRAPPED",
          entityType: "USER",
          entityId: user.id,
          newValue: {
            email: user.email,
            role: user.role,
            status: user.status,
          },
        },
      });

      return { outcome: "created" as const, user };
    },
    {
      maxWait: 20_000,
      timeout: 20_000,
    },
  );
}
