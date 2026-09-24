import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/authorization";

const mocks = vi.hoisted(() => ({
  accessible: vi.fn(),
  signedUpload: vi.fn(),
  signedView: vi.fn(),
  head: vi.fn(),
  removeObject: vi.fn(),
  findMedia: vi.fn(),
  listMedia: vi.fn(),
  deleteMedia: vi.fn(),
  createMedia: vi.fn(),
  signature: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getR2Env: () => ({ secretAccessKey: "test-secret" }),
}));
vi.mock("@/server/auth/scopes", () => ({
  requireAccessibleClient: mocks.accessible,
}));
vi.mock("@/server/audit/write-audit", () => ({ writeAudit: mocks.audit }));
vi.mock("@/server/db/client", () => ({
  db: {
    media: { findUnique: mocks.findMedia, findMany: mocks.listMedia },
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        media: { delete: mocks.deleteMedia, create: mocks.createMedia },
        auditLog: { create: mocks.audit },
      }),
  },
}));
vi.mock("@/server/services/r2", () => ({
  signedUploadUrl: mocks.signedUpload,
  signedViewUrl: mocks.signedView,
  headMedia: mocks.head,
  deleteMediaObject: mocks.removeObject,
  mediaSignature: mocks.signature,
}));

import {
  getMediaViewUrl,
  finalizeMediaUpload,
  initiateMediaUpload,
  listClientMedia,
  removeMedia,
} from "@/server/services/media";

const clientId = "00000000-0000-4000-8000-000000000001";
const mediaId = "00000000-0000-4000-8000-000000000002";
const actor: Actor = {
  id: "00000000-0000-4000-8000-000000000003",
  clerkUserId: "clerk",
  role: "CLIENT",
  status: "ACTIVE",
  timezone: "UTC",
  coachProfileId: null,
  clientProfileId: clientId,
};
const media = {
  id: mediaId,
  clientId,
  objectKey: `clients/${clientId}/media/${mediaId}/00000000-0000-4000-8000-000000000004.jpg`,
  etag: '"etag"',
  byteSize: 3,
  mimeType: "image/jpeg",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.accessible.mockResolvedValue({
    id: clientId,
    user: { timezone: "UTC" },
  });
  mocks.findMedia.mockResolvedValue(media);
  mocks.head.mockResolvedValue({
    ETag: '"etag"',
    ContentLength: 3,
    ContentType: "image/jpeg",
  });
  mocks.signedUpload.mockResolvedValue("https://r2.example/upload");
  mocks.signedView.mockResolvedValue("https://r2.example/view");
  mocks.removeObject.mockResolvedValue(undefined);
  mocks.deleteMedia.mockResolvedValue(media);
  mocks.createMedia.mockImplementation(async ({ data }) => data);
  mocks.signature.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff]));
});

describe("media service with mocked R2", () => {
  it("authorizes before signing a generated upload key", async () => {
    const result = await initiateMediaUpload(actor, {
      clientId,
      filename: "pose.jpg",
      mimeType: "image/jpeg",
      mediaType: "IMAGE",
      byteSize: 3,
    });
    expect(mocks.accessible).toHaveBeenCalledWith(
      expect.anything(),
      actor,
      clientId,
    );
    expect(mocks.signedUpload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^clients/${clientId}/media/`)),
      "image/jpeg",
      3,
    );
    expect(result.ticket).toContain(".");
  });

  it("does not sign when client access fails", async () => {
    mocks.accessible.mockRejectedValueOnce(new Error("Resource not found"));
    await expect(
      initiateMediaUpload(actor, {
        clientId,
        filename: "pose.jpg",
        mimeType: "image/jpeg",
        mediaType: "IMAGE",
        byteSize: 3,
      }),
    ).rejects.toThrow();
    expect(mocks.signedUpload).not.toHaveBeenCalled();
  });

  it("finalizes only after R2 confirms the object", async () => {
    mocks.findMedia.mockResolvedValueOnce(null);
    const { ticket } = await initiateMediaUpload(actor, {
      clientId,
      filename: "pose.jpg",
      mimeType: "image/jpeg",
      mediaType: "IMAGE",
      byteSize: 3,
    });
    const result = await finalizeMediaUpload(actor, ticket);
    expect(result).toMatchObject({
      clientId,
      uploaderId: actor.id,
      byteSize: 3,
      etag: '"etag"',
    });
    expect(mocks.createMedia).toHaveBeenCalledOnce();
  });

  it("persists the selected calendar date in the upload ticket", async () => {
    mocks.findMedia.mockResolvedValueOnce(null);
    const { ticket } = await initiateMediaUpload(actor, {
      clientId,
      filename: "pose.jpg",
      mimeType: "image/jpeg",
      mediaType: "IMAGE",
      byteSize: 3,
      mediaDate: "2026-09-20",
    });
    await finalizeMediaUpload(actor, ticket);
    expect(mocks.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mediaDate: new Date("2026-09-20T00:00:00.000Z"),
        }),
      }),
    );
  });

  it("defaults a new upload to the client's current local date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T02:00:00Z"));
    try {
      mocks.accessible.mockResolvedValueOnce({
        id: clientId,
        user: { timezone: "America/New_York" },
      });
      mocks.findMedia.mockResolvedValueOnce(null);
      const { ticket } = await initiateMediaUpload(actor, {
        clientId,
        filename: "pose.jpg",
        mimeType: "image/jpeg",
        mediaType: "IMAGE",
        byteSize: 3,
      });
      await finalizeMediaUpload(actor, ticket);
      expect(mocks.createMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mediaDate: new Date("2026-09-30T00:00:00Z"),
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("queries one local day including legacy media with no associated date", async () => {
    mocks.accessible.mockResolvedValueOnce({
      id: clientId,
      user: { timezone: "America/New_York" },
    });
    mocks.listMedia.mockResolvedValueOnce([]);
    await listClientMedia(actor, clientId, "2026-09-30");
    expect(mocks.listMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId,
          OR: [
            { mediaDate: new Date("2026-09-30T00:00:00Z") },
            {
              mediaDate: null,
              createdAt: {
                gte: new Date("2026-09-30T04:00:00Z"),
                lt: new Date("2026-10-01T04:00:00Z"),
              },
            },
          ],
        },
      }),
    );
  });

  it("does not create metadata when R2 content differs", async () => {
    mocks.findMedia.mockResolvedValueOnce(null);
    mocks.signature.mockResolvedValueOnce(Buffer.from("bad"));
    const { ticket } = await initiateMediaUpload(actor, {
      clientId,
      filename: "pose.jpg",
      mimeType: "image/jpeg",
      mediaType: "IMAGE",
      byteSize: 3,
    });
    await expect(finalizeMediaUpload(actor, ticket)).rejects.toThrow(
      "did not match",
    );
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });

  it("checks the stored object before signing a view URL", async () => {
    await expect(getMediaViewUrl(actor, mediaId)).resolves.toEqual({
      url: "https://r2.example/view",
      expiresIn: 600,
    });
    expect(mocks.signedView).toHaveBeenCalledWith(media.objectKey);
  });

  it("deletes the R2 object then database metadata", async () => {
    await removeMedia(actor, mediaId);
    expect(mocks.removeObject).toHaveBeenCalledWith(media.objectKey);
    expect(mocks.deleteMedia).toHaveBeenCalledWith({ where: { id: mediaId } });
    expect(mocks.audit).toHaveBeenCalled();
  });
});
