import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { db } from "@/server/db/client";
import { getServerEnv } from "@/lib/env";
import { writeAudit } from "@/server/audit/write-audit";
import { syncClerkIdentity } from "@/server/auth/sync-clerk-identity";

function webhookSecret() {
  const env = getServerEnv();
  return env.CLERK_WEBHOOK_SIGNING_SECRET ?? env.CLERK_WEBHOOK_SECRET;
}

function logContext(request: NextRequest, eventType?: string) {
  return {
    eventId: request.headers.get("svix-id") ?? "unknown",
    eventType: eventType ?? "unknown",
  };
}

export async function POST(request: NextRequest) {
  const secret = webhookSecret();
  if (!secret) {
    console.error("clerk_webhook_not_configured");
    return new Response("Webhook not configured", { status: 503 });
  }

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret: secret });
  } catch {
    console.warn("clerk_webhook_invalid_signature", logContext(request));
    return new Response("Invalid webhook", { status: 400 });
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const primary =
        event.data.email_addresses.find(
          (email) => email.id === event.data.primary_email_address_id,
        ) ?? event.data.email_addresses[0];
      if (!primary) return new Response("No primary email", { status: 202 });

      const result = await syncClerkIdentity(db, {
        clerkUserId: event.data.id,
        email: primary.email_address,
        emailVerified: primary.verification?.status === "verified",
        firstName: event.data.first_name,
        lastName: event.data.last_name,
        applicationUserId:
          typeof event.data.public_metadata?.applicationUserId === "string"
            ? event.data.public_metadata.applicationUserId
            : null,
        source: "webhook",
      });
      console.info("clerk_webhook_sync_complete", {
        ...logContext(request, event.type),
        outcome: result.outcome,
        ...("reason" in result ? { reason: result.reason } : {}),
      });
    }

    if (event.type === "user.deleted" && event.data.id) {
      await db.$transaction(
        async (tx) => {
          const existing = await tx.user.findUnique({
            where: { clerkUserId: event.data.id },
          });
          if (!existing) return;
          await tx.user.update({
            where: { id: existing.id },
            data: {
              deletedAt: new Date(),
              status: "ARCHIVED",
              clerkUserId: null,
            },
          });
          await writeAudit(tx, {
            action: "CLERK_USER_SOFT_DELETED",
            entityType: "USER",
            entityId: existing.id,
            oldValue: { status: existing.status },
            newValue: { status: "ARCHIVED", deleted: true },
          });
        },
        {
          maxWait: 20_000,
          timeout: 20_000,
        },
      );
    }

    return new Response("OK");
  } catch (error) {
    console.error("clerk_webhook_processing_failed", {
      ...logContext(request, event.type),
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    return new Response("Webhook temporarily unavailable", { status: 503 });
  }
}
