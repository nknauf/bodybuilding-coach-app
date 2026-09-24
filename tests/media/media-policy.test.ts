import { describe, expect, it } from "vitest";
import { MEDIA_LIMITS } from "@/lib/media-constants";
import {
  objectKeyFor,
  ownsObjectKey,
  signatureMatches,
  validateUpload,
} from "@/server/services/media-policy";

const clientId = "00000000-0000-4000-8000-000000000001";
const mediaId = "00000000-0000-4000-8000-000000000002";
const base = { clientId, filename: "check-in.jpg", caption: "Week 7" };

describe("media policy", () => {
  it.each([
    ["IMAGE", "image/jpeg", MEDIA_LIMITS.IMAGE],
    ["VIDEO", "video/mp4", MEDIA_LIMITS.VIDEO],
  ] as const)("accepts supported %s", (mediaType, mimeType, byteSize) => {
    expect(
      validateUpload({ ...base, mediaType, mimeType, byteSize }).spec.type,
    ).toBe(mediaType);
  });

  it.each([
    { mediaType: "IMAGE", mimeType: "image/gif", byteSize: 10 },
    {
      mediaType: "IMAGE",
      mimeType: "image/jpeg",
      byteSize: MEDIA_LIMITS.IMAGE + 1,
    },
    {
      mediaType: "VIDEO",
      mimeType: "video/mp4",
      byteSize: MEDIA_LIMITS.VIDEO + 1,
    },
    { mediaType: "VIDEO", mimeType: "image/jpeg", byteSize: 10 },
  ])("rejects invalid metadata %#", (input) => {
    expect(() => validateUpload({ ...base, ...input })).toThrow();
  });

  it("generates collision-resistant, client-owned keys", () => {
    const key = objectKeyFor(clientId, mediaId, "jpg");
    expect(ownsObjectKey(clientId, mediaId, key)).toBe(true);
    expect(
      ownsObjectKey("00000000-0000-4000-8000-000000000003", mediaId, key),
    ).toBe(false);
    expect(ownsObjectKey(clientId, mediaId, key.replace(".jpg", ".exe"))).toBe(
      false,
    );
    expect(objectKeyFor(clientId, mediaId, "jpg")).not.toBe(key);
  });

  it("checks object bytes rather than trusting MIME metadata alone", () => {
    expect(
      signatureMatches(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg"),
    ).toBe(true);
    expect(signatureMatches(Buffer.from("not an image"), "image/jpeg")).toBe(
      false,
    );
    expect(
      signatureMatches(
        Buffer.from([0, 0, 0, 20, 102, 116, 121, 112]),
        "video/mp4",
      ),
    ).toBe(true);
  });
});
