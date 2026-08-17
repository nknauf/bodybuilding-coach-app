import { parseArgs } from "node:util";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { syncClerkIdentity } from "@/server/auth/sync-clerk-identity";
import { normalizedEmailSchema } from "@/server/validation/email";

const linkClerkUserSchema = z.object({
  email: normalizedEmailSchema,
  clerkUserId: z.string().trim().min(1),
});

export function parseLinkClerkUserArgs(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      email: { type: "string" },
      "clerk-user-id": { type: "string" },
    },
    allowPositionals: false,
    strict: true,
  });
  return linkClerkUserSchema.parse({
    email: values.email,
    clerkUserId: values["clerk-user-id"],
  });
}

export async function linkClerkUser(
  database: Pick<PrismaClient, "$transaction">,
  rawInput: unknown,
) {
  const input = linkClerkUserSchema.parse(rawInput);
  const result = await syncClerkIdentity(database, {
    ...input,
    emailVerified: true,
    firstName: null,
    lastName: null,
    applicationUserId: null,
    source: "operator",
  });
  if (result.outcome === "not_provisioned") {
    throw new Error(`No application user is provisioned for ${input.email}.`);
  }
  if (result.outcome === "rejected") {
    throw new Error(`Clerk identity link rejected: ${result.reason}.`);
  }
  return result;
}
