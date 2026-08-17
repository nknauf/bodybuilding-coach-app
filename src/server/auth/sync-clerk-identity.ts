import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { normalizedEmailSchema } from "@/server/validation/email";

const identitySchema = z.object({
  clerkUserId: z.string().trim().min(1),
  email: normalizedEmailSchema,
  emailVerified: z.boolean(),
  firstName: z.string().trim().max(80).nullish(),
  lastName: z.string().trim().max(80).nullish(),
  applicationUserId: z.string().uuid().nullish(),
  source: z.enum(["webhook", "session_recovery", "operator"]),
});

export type ClerkIdentityInput = z.infer<typeof identitySchema>;
export type ClerkIdentityRejection =
  | "email_unverified"
  | "identity_email_collision"
  | "invitation_metadata_mismatch"
  | "account_unavailable";

export type ClerkIdentitySyncResult =
  | {
      outcome: "linked" | "already_linked";
      userId: string;
      status: "ACTIVE" | "DISABLED";
    }
  | { outcome: "not_provisioned" }
  | {
      outcome: "rejected";
      reason: ClerkIdentityRejection;
      userId?: string;
    };

const transactionOptions = { maxWait: 20_000, timeout: 20_000 } as const;

export async function syncClerkIdentity(
  database: Pick<PrismaClient, "$transaction">,
  rawInput: unknown,
): Promise<ClerkIdentitySyncResult> {
  const input = identitySchema.parse(rawInput);

  return database.$transaction(async (tx) => {
    const [byClerkId, byEmail] = await Promise.all([
      tx.user.findUnique({
        where: { clerkUserId: input.clerkUserId },
        include: { clientProfile: true },
      }),
      tx.user.findUnique({
        where: { email: input.email },
        include: { clientProfile: true },
      }),
    ]);

    if (byClerkId && byEmail && byClerkId.id !== byEmail.id) {
      await tx.auditLog.create({
        data: {
          action: "CLERK_USER_SYNC_REJECTED",
          entityType: "USER",
          entityId: byClerkId.id,
          newValue: {
            reason: "identity_email_collision",
            source: input.source,
          },
        },
      });
      return {
        outcome: "rejected",
        reason: "identity_email_collision",
        userId: byClerkId.id,
      };
    }

    const existing = byClerkId ?? byEmail;
    if (!existing) return { outcome: "not_provisioned" };

    const reject = async (reason: ClerkIdentityRejection) => {
      await tx.auditLog.create({
        data: {
          action: "CLERK_USER_SYNC_REJECTED",
          entityType: "USER",
          entityId: existing.id,
          newValue: { reason, source: input.source },
        },
      });
      return {
        outcome: "rejected" as const,
        reason,
        userId: existing.id,
      };
    };

    if (!input.emailVerified) return reject("email_unverified");
    if (input.applicationUserId && input.applicationUserId !== existing.id) {
      return reject("invitation_metadata_mismatch");
    }
    if (existing.deletedAt || existing.status === "ARCHIVED") {
      return reject("account_unavailable");
    }

    const activated = existing.status === "INVITED";
    const newlyLinked = existing.clerkUserId !== input.clerkUserId;
    const status = activated ? "ACTIVE" : existing.status;
    if (status !== "ACTIVE" && status !== "DISABLED") {
      return reject("account_unavailable");
    }

    await tx.user.update({
      where: { id: existing.id },
      data: {
        clerkUserId: input.clerkUserId,
        email: input.email,
        firstName: input.firstName || existing.firstName,
        lastName: input.lastName || existing.lastName,
        status,
      },
    });

    if (existing.clientProfile && activated) {
      await tx.clientProfile.update({
        where: { id: existing.clientProfile.id },
        data: {
          status: "ACTIVE",
          joinedAt: existing.clientProfile.joinedAt ?? new Date(),
        },
      });
      await tx.clientInvite.updateMany({
        where: {
          status: "PENDING",
          OR: [{ clientUserId: existing.id }, { email: input.email }],
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          deliveryError: null,
        },
      });
    }

    const action =
      input.source === "operator" && activated
        ? "CLERK_USER_ACTIVATED_MANUALLY"
        : activated
          ? "CLERK_USER_ACTIVATED"
          : "CLERK_USER_SYNCED";
    await tx.auditLog.create({
      data: {
        action,
        entityType: "USER",
        entityId: existing.id,
        newValue: {
          clerkUserId: input.clerkUserId,
          email: input.email,
          source: input.source,
        },
      },
    });

    return {
      outcome: activated || newlyLinked ? "linked" : "already_linked",
      userId: existing.id,
      status,
    };
  }, transactionOptions);
}
