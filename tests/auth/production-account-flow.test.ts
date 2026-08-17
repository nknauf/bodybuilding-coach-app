import { describe, expect, it } from "vitest";
import {
  assertEmailAvailableForRole,
  workspacePathForRole,
} from "@/server/auth/provisioning";
import { assertRole, type Actor } from "@/server/auth/authorization";

const actor = (role: Actor["role"]): Actor => ({
  id: `user-${role.toLowerCase()}`,
  clerkUserId: `clerk-${role.toLowerCase()}`,
  role,
  status: "ACTIVE",
  timezone: "UTC",
  coachProfileId: role === "COACH" ? "coach-id" : null,
  clientProfileId: role === "CLIENT" ? "client-id" : null,
});

describe("genuine production account policy", () => {
  it.each([
    ["ADMIN", "/admin"],
    ["COACH", "/coach"],
    ["CLIENT", "/client"],
  ] as const)("routes a real %s user to %s", (role, path) => {
    expect(workspacePathForRole(role)).toBe(path);
  });

  it("permits only an administrator to use coach provisioning authorization", () => {
    expect(() => assertRole(actor("ADMIN"), ["ADMIN"])).not.toThrow();
    expect(() => assertRole(actor("COACH"), ["ADMIN"])).toThrow(
      "Resource not found",
    );
    expect(() => assertRole(actor("CLIENT"), ["ADMIN"])).toThrow(
      "Resource not found",
    );
  });

  it("rejects same-role duplicates with a useful message", () => {
    expect(() =>
      assertEmailAvailableForRole(
        { role: "COACH", status: "INVITED", deletedAt: null },
        "COACH",
      ),
    ).toThrow("already provisioned");
  });

  it.each(["ADMIN", "CLIENT"] as const)(
    "rejects a coach address already assigned to %s",
    (role) => {
      expect(() =>
        assertEmailAvailableForRole(
          { role, status: "ACTIVE", deletedAt: null },
          "COACH",
        ),
      ).toThrow("another application account");
    },
  );

  it("does not permit reusing archived or deleted identities", () => {
    expect(() =>
      assertEmailAvailableForRole(
        { role: "CLIENT", status: "ARCHIVED", deletedAt: new Date() },
        "CLIENT",
      ),
    ).toThrow("another application account");
  });
});
