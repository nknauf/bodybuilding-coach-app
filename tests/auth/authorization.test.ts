import { describe, expect, it } from "vitest";
import type { Actor } from "@/server/auth/authorization";
import {
  assertClientAccess,
  canAccessClient,
} from "@/server/auth/authorization";
import { clientScopeWhere } from "@/server/auth/scopes";

const coachA: Actor = {
  id: "user-coach-a",
  clerkUserId: "clerk-a",
  role: "COACH",
  status: "ACTIVE",
  timezone: "UTC",
  coachProfileId: "coach-a",
  clientProfileId: null,
};
const coachB: Actor = {
  ...coachA,
  id: "user-coach-b",
  clerkUserId: "clerk-b",
  coachProfileId: "coach-b",
};
const clientB = {
  id: "client-b",
  userId: "user-client-b",
  coachId: "coach-b",
};

describe("central tenant authorization", () => {
  it("allows a coach to access their own client", () => {
    expect(canAccessClient(coachB, clientB)).toBe(true);
  });

  it("returns the same safe authorization error for a guessed cross-tenant ID", () => {
    expect(() => assertClientAccess(coachA, clientB)).toThrow(
      "Resource not found",
    );
  });

  it("always includes the authenticated coach ID in scoped reads", () => {
    expect(clientScopeWhere(coachA, "client-b")).toMatchObject({
      id: "client-b",
      coachId: "coach-a",
    });
  });

  it("uses a different scope for Coach B even with the same guessed object ID", () => {
    expect(clientScopeWhere(coachB, "client-b")).toMatchObject({
      id: "client-b",
      coachId: "coach-b",
    });
  });

  it("rejects disabled accounts before ownership checks", () => {
    expect(() =>
      assertClientAccess({ ...coachB, status: "DISABLED" }, clientB),
    ).toThrow("Account unavailable");
  });
});
