CREATE TYPE "InviteDeliveryMethod" AS ENUM ('CLERK_EMAIL', 'MANUAL_LINK');

ALTER TABLE "ClientInvite"
ADD COLUMN "clientUserId" UUID,
ADD COLUMN "deliveryMethod" "InviteDeliveryMethod",
ADD COLUMN "clerkInvitationId" TEXT,
ADD COLUMN "deliveryError" TEXT,
ADD COLUMN "lastDeliveredAt" TIMESTAMP(3);

UPDATE "ClientInvite" AS invite
SET "clientUserId" = app_user."id"
FROM "User" AS app_user
WHERE lower(invite."email") = lower(app_user."email")
  AND app_user."role" = 'CLIENT';

ALTER TABLE "SupplementEvent" ADD COLUMN "coachNotes" TEXT;

CREATE UNIQUE INDEX "ClientInvite_clerkInvitationId_key"
ON "ClientInvite"("clerkInvitationId");

CREATE INDEX "ClientInvite_clientUserId_status_idx"
ON "ClientInvite"("clientUserId", "status");

ALTER TABLE "ClientInvite"
ADD CONSTRAINT "ClientInvite_clientUserId_fkey"
FOREIGN KEY ("clientUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
