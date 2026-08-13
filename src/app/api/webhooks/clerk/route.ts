import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { db } from "@/server/db/client";
import { getServerEnv } from "@/lib/env";
import { writeAudit } from "@/server/audit/write-audit";

export async function POST(request: NextRequest) {
  const secret = getServerEnv().CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret: secret });
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const primary =
      event.data.email_addresses.find(
        (email) => email.id === event.data.primary_email_address_id,
      ) ?? event.data.email_addresses[0];
    if (!primary) return new Response("No primary email", { status: 202 });
    const email = primary.email_address.trim().toLowerCase();

    await db.$transaction(async (tx) => {
      const [byClerkId, byEmail] = await Promise.all([
        tx.user.findUnique({
          where: { clerkUserId: event.data.id },
          include: { clientProfile: true },
        }),
        tx.user.findUnique({
          where: { email },
          include: { clientProfile: true },
        }),
      ]);
      if (byClerkId && byEmail && byClerkId.id !== byEmail.id) {
        await writeAudit(tx, {
          action: "CLERK_USER_SYNC_REJECTED",
          entityType: "USER",
          entityId: byClerkId.id,
          newValue: { reason: "identity_email_collision" },
        });
        return;
      }
      const existing = byClerkId ?? byEmail;
      const metadataUserId =
        typeof event.data.public_metadata?.applicationUserId === "string"
          ? event.data.public_metadata.applicationUserId
          : null;
      if (metadataUserId && existing && metadataUserId !== existing.id) {
        await writeAudit(tx, {
          action: "CLERK_USER_SYNC_REJECTED",
          entityType: "USER",
          entityId: existing.id,
          newValue: { reason: "invitation_metadata_mismatch" },
        });
        return;
      }
      // Roles are provisioned by an admin/coach. A public Clerk signup never
      // creates an application role by itself.
      if (!existing) return;
      const activated = existing.status === "INVITED";
      await tx.user.update({
        where: { id: existing.id },
        data: {
          clerkUserId: event.data.id,
          email,
          firstName: event.data.first_name ?? existing.firstName,
          lastName: event.data.last_name ?? existing.lastName,
          status: activated ? "ACTIVE" : existing.status,
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
            OR: [{ clientUserId: existing.id }, { email }],
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            deliveryError: null,
          },
        });
      }
      await writeAudit(tx, {
        action: activated ? "CLERK_USER_ACTIVATED" : "CLERK_USER_SYNCED",
        entityType: "USER",
        entityId: existing.id,
        newValue: { clerkUserId: event.data.id, email },
      });
    });
  }

  if (event.type === "user.deleted" && event.data.id) {
    await db.$transaction(async (tx) => {
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
    });
  }

  return new Response("OK");
}
