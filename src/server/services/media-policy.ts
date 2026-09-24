import { randomUUID } from "node:crypto";
import { z } from "zod";
import { MEDIA_LIMITS, MEDIA_TYPES } from "@/lib/media-constants";

export { MEDIA_LIMITS, MEDIA_TYPES };
export const MEDIA_URL_TTL_SECONDS = { upload: 300, view: 600 } as const;

const uuid = z.uuid();
export const requestUploadSchema = z.object({
  clientId: uuid,
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  byteSize: z.number().int().positive(),
  caption: z.string().trim().max(MEDIA_LIMITS.caption).optional(),
  mediaDate: z.iso.date().optional(),
});

export function validateUpload(raw: unknown) {
  const input = requestUploadSchema.parse(raw);
  const spec = MEDIA_TYPES[input.mimeType as keyof typeof MEDIA_TYPES];
  if (!spec || spec.type !== input.mediaType)
    throw new Error("Unsupported media type.");
  if (input.byteSize > MEDIA_LIMITS[spec.type])
    throw new Error("File is too large.");
  return { ...input, spec, caption: input.caption || null };
}

export function objectKeyFor(
  clientId: string,
  mediaId: string,
  extension: string,
) {
  if (
    !uuid.safeParse(clientId).success ||
    !uuid.safeParse(mediaId).success ||
    !/^(jpg|png|webp|mp4|mov|webm)$/.test(extension)
  ) {
    throw new Error("Invalid media key components.");
  }
  return `clients/${clientId}/media/${mediaId}/${randomUUID()}.${extension}`;
}

export function ownsObjectKey(clientId: string, mediaId: string, key: string) {
  return (
    key.startsWith(`clients/${clientId}/media/${mediaId}/`) &&
    /^clients\/[0-9a-f-]+\/media\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp|mp4|mov|webm)$/.test(
      key,
    )
  );
}

export function signatureMatches(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp")
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  if (mimeType === "video/webm")
    return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mimeType === "video/mp4") return bytes.toString("ascii", 4, 8) === "ftyp";
  if (mimeType === "video/quicktime")
    return (
      bytes.toString("ascii", 4, 8) === "ftyp" ||
      ["moov", "mdat", "wide"].includes(bytes.toString("ascii", 4, 8))
    );
  return false;
}
