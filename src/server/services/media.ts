import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getR2Env } from "@/lib/env";
import type { Actor } from "@/server/auth/authorization";
import { AuthorizationError } from "@/server/auth/errors";
import { requireAccessibleClient } from "@/server/auth/scopes";
import { writeAudit } from "@/server/audit/write-audit";
import { db } from "@/server/db/client";
import {
  dateOnlyValue,
  localDateUtcRange,
  localDayKey,
} from "@/server/domain/time";
import {
  MEDIA_URL_TTL_SECONDS,
  objectKeyFor,
  ownsObjectKey,
  signatureMatches,
  validateUpload,
} from "./media-policy";
import {
  deleteMediaObject,
  headMedia,
  mediaSignature,
  signedUploadUrl,
  signedViewUrl,
} from "./r2";

const ticketSchema = z.object({
  actorId: z.uuid(),
  clientId: z.uuid(),
  mediaId: z.uuid(),
  key: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  byteSize: z.number().int().positive(),
  caption: z.string().nullable(),
  mediaDate: z.iso.date().optional(),
  expiresAt: z.number().int(),
});

function signature(payload: string) {
  return createHmac("sha256", getR2Env().secretAccessKey)
    .update(`media-upload-v1:${payload}`)
    .digest("base64url");
}

function makeTicket(data: z.infer<typeof ticketSchema>) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function readTicket(token: unknown) {
  if (typeof token !== "string" || token.length > 4096)
    throw new Error("Upload authorization expired. Select the file again.");
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra)
    throw new Error("Upload authorization expired. Select the file again.");
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(mac);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    throw new Error("Upload authorization expired. Select the file again.");
  const data = ticketSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
  );
  if (
    Date.now() > data.expiresAt ||
    !ownsObjectKey(data.clientId, data.mediaId, data.key)
  ) {
    throw new Error("Upload authorization expired. Select the file again.");
  }
  validateUpload({ ...data, caption: data.caption ?? undefined });
  return data;
}

export async function initiateMediaUpload(actor: Actor, raw: unknown) {
  const input = validateUpload(raw);
  const client = await requireAccessibleClient(db, actor, input.clientId);
  const mediaDate =
    input.mediaDate ?? localDayKey(new Date(), client.user.timezone);
  dateOnlyValue(mediaDate);
  const mediaId = randomUUID();
  const key = objectKeyFor(input.clientId, mediaId, input.spec.extension);
  const ticket = makeTicket({
    actorId: actor.id,
    clientId: input.clientId,
    mediaId,
    key,
    filename: input.filename,
    mimeType: input.mimeType,
    mediaType: input.mediaType,
    byteSize: input.byteSize,
    caption: input.caption,
    mediaDate,
    expiresAt: Date.now() + MEDIA_URL_TTL_SECONDS.upload * 1000,
  });
  return {
    uploadUrl: await signedUploadUrl(key, input.mimeType, input.byteSize),
    ticket,
    expiresIn: MEDIA_URL_TTL_SECONDS.upload,
  };
}

export async function finalizeMediaUpload(actor: Actor, rawTicket: unknown) {
  const ticket = readTicket(rawTicket);
  if (ticket.actorId !== actor.id) throw new AuthorizationError();
  const client = await requireAccessibleClient(db, actor, ticket.clientId);
  const mediaDate =
    ticket.mediaDate ?? localDayKey(new Date(), client.user.timezone);
  const existing = await db.media.findUnique({ where: { id: ticket.mediaId } });
  if (existing) {
    if (existing.objectKey !== ticket.key || existing.uploaderId !== actor.id)
      throw new AuthorizationError();
    return existing;
  }
  let head;
  try {
    head = await headMedia(ticket.key);
  } catch (error) {
    console.error("media_head_failed", { key: ticket.key, error });
    throw new Error("Upload could not be confirmed. Try uploading again.");
  }
  if (
    head.ContentLength !== ticket.byteSize ||
    head.ContentType?.split(";")[0]?.trim() !== ticket.mimeType ||
    !head.ETag
  ) {
    throw new Error("Uploaded file did not match the selected file.");
  }
  try {
    if (!signatureMatches(await mediaSignature(ticket.key), ticket.mimeType))
      throw new Error("Uploaded file did not match the selected file.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Uploaded file did not match the selected file."
    )
      throw error;
    console.error("media_signature_failed", { key: ticket.key, error });
    throw new Error("Upload could not be confirmed. Try uploading again.");
  }
  try {
    return await db.$transaction(async (tx) => {
      const media = await tx.media.create({
        data: {
          id: ticket.mediaId,
          clientId: ticket.clientId,
          uploaderId: actor.id,
          objectKey: ticket.key,
          filename: ticket.filename,
          mimeType: ticket.mimeType,
          mediaType: ticket.mediaType,
          byteSize: ticket.byteSize,
          etag: head.ETag!,
          caption: ticket.caption,
          mediaDate: dateOnlyValue(mediaDate),
        },
      });
      await writeAudit(tx, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: "MEDIA_UPLOADED",
        entityType: "MEDIA",
        entityId: media.id,
        newValue: {
          clientId: media.clientId,
          mimeType: media.mimeType,
          byteSize: media.byteSize,
          mediaDate,
        },
      });
      return media;
    });
  } catch (error) {
    console.error("media_finalize_failed", { key: ticket.key, error });
    throw new Error(
      "Upload reached storage but could not be saved. Please retry.",
    );
  }
}

export async function listClientMedia(
  actor: Actor,
  clientId: string,
  day?: string,
) {
  const client = await requireAccessibleClient(db, actor, clientId);
  const range = day ? localDateUtcRange(day, client.user.timezone) : null;
  return db.media.findMany({
    where: {
      clientId,
      ...(day && range
        ? {
            OR: [
              { mediaDate: dateOnlyValue(day) },
              {
                mediaDate: null,
                createdAt: { gte: range.start, lt: range.end },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      filename: true,
      mimeType: true,
      mediaType: true,
      byteSize: true,
      caption: true,
      createdAt: true,
      mediaDate: true,
    },
  });
}

async function accessibleMedia(actor: Actor, id: string) {
  if (!z.uuid().safeParse(id).success) throw new AuthorizationError();
  const media = await db.media.findUnique({ where: { id } });
  if (!media) throw new AuthorizationError();
  await requireAccessibleClient(db, actor, media.clientId);
  return media;
}

export async function getMediaViewUrl(actor: Actor, id: string) {
  const media = await accessibleMedia(actor, id);
  try {
    const head = await headMedia(media.objectKey);
    if (
      head.ETag !== media.etag ||
      head.ContentLength !== media.byteSize ||
      head.ContentType?.split(";")[0]?.trim() !== media.mimeType
    )
      throw new Error("Stored media changed.");
    return {
      url: await signedViewUrl(media.objectKey),
      expiresIn: MEDIA_URL_TTL_SECONDS.view,
    };
  } catch (error) {
    console.error("media_view_failed", { mediaId: id, error });
    throw new Error("Media is temporarily unavailable.");
  }
}

export async function removeMedia(actor: Actor, id: string) {
  const media = await accessibleMedia(actor, id);
  try {
    await deleteMediaObject(media.objectKey);
  } catch (error) {
    console.error("media_delete_object_failed", { mediaId: id, error });
    throw new Error("Media could not be deleted. Try again.");
  }
  await db.$transaction(async (tx) => {
    await tx.media.delete({ where: { id: media.id } });
    await writeAudit(tx, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "MEDIA_DELETED",
      entityType: "MEDIA",
      entityId: media.id,
      oldValue: { clientId: media.clientId, objectKey: media.objectKey },
    });
  });
}
