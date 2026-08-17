import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { getServerEnv } from "@/lib/env";
import { syncClerkIdentity } from "@/server/auth/sync-clerk-identity";
import { POST } from "@/app/api/webhooks/clerk/route";

vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: vi.fn() }));
vi.mock("@/lib/env", () => ({ getServerEnv: vi.fn() }));
vi.mock("@/server/auth/sync-clerk-identity", () => ({
  syncClerkIdentity: vi.fn(),
}));
vi.mock("@/server/db/client", () => ({
  db: { $transaction: vi.fn() },
}));

function request() {
  return new NextRequest("https://example.com/api/webhooks/clerk", {
    method: "POST",
    headers: { "svix-id": "msg_123" },
  });
}

const event = {
  type: "user.created",
  data: {
    id: "user_3I151qQfx1H6kNt42lUvtLHdUvT",
    email_addresses: [
      {
        id: "idn_3I14yhpMJLFvw9UUVfiDHSGXj2I",
        email_address: "noahknauf@icloud.com",
        verification: { status: "verified" },
      },
    ],
    primary_email_address_id: "idn_3I14yhpMJLFvw9UUVfiDHSGXj2I",
    first_name: null,
    last_name: null,
    public_metadata: {},
  },
};

describe("Clerk webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 503 when no signing secret is deployed", async () => {
    vi.mocked(getServerEnv).mockReturnValue({
      DATABASE_URL: "postgresql://example",
    });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Webhook not configured");
  });

  it("returns 400 for an invalid signature", async () => {
    vi.mocked(getServerEnv).mockReturnValue({
      DATABASE_URL: "postgresql://example",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test",
    });
    vi.mocked(verifyWebhook).mockRejectedValue(new Error("invalid"));
    const response = await POST(request());
    expect(response.status).toBe(400);
  });

  it("accepts the failed user.created payload shape", async () => {
    vi.mocked(getServerEnv).mockReturnValue({
      DATABASE_URL: "postgresql://example",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test",
    });
    vi.mocked(verifyWebhook).mockResolvedValue(
      event as unknown as Awaited<ReturnType<typeof verifyWebhook>>,
    );
    vi.mocked(syncClerkIdentity).mockResolvedValue({
      outcome: "linked",
      userId: "application-user",
      status: "ACTIVE",
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(syncClerkIdentity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: "noahknauf@icloud.com",
        emailVerified: true,
        firstName: null,
        lastName: null,
        source: "webhook",
      }),
    );
  });

  it("returns retryable 503 when database processing fails", async () => {
    vi.mocked(getServerEnv).mockReturnValue({
      DATABASE_URL: "postgresql://example",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test",
    });
    vi.mocked(verifyWebhook).mockResolvedValue(
      event as unknown as Awaited<ReturnType<typeof verifyWebhook>>,
    );
    vi.mocked(syncClerkIdentity).mockRejectedValue(
      new Error("Unable to start a transaction"),
    );
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Webhook temporarily unavailable");
  });
});
