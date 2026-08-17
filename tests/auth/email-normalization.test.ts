import { describe, expect, it } from "vitest";
import { normalizedEmailSchema } from "@/server/validation/email";

describe("production identity email normalization", () => {
  it("trims and lowercases without collapsing provider aliases", () => {
    expect(normalizedEmailSchema.parse("  Noah+Coach@iCloud.com  ")).toBe(
      "noah+coach@icloud.com",
    );
  });

  it("keeps distinct aliases as distinct database identities", () => {
    const coach = normalizedEmailSchema.parse("owner+coach@example.com");
    const client = normalizedEmailSchema.parse("owner+client@example.com");
    expect(coach).not.toBe(client);
  });

  it("rejects invalid addresses", () => {
    expect(() => normalizedEmailSchema.parse("not-an-email")).toThrow();
  });
});
