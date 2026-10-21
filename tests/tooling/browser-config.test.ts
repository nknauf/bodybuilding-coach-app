import { describe, expect, it } from "vitest";
import { resolveE2ETarget } from "../../scripts/lib/e2e-target.mjs";

describe("browser smoke target safeguards", () => {
  it.each([
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100/demo",
    "http://127.0.0.1:3100/?next=/",
    "http://user:pass@127.0.0.1:3100",
  ])("rejects unsafe target %s", (target) => {
    expect(() => resolveE2ETarget({ E2E_BASE_URL: target })).toThrow();
  });

  it("rejects a remote target without an explicit approved-host opt-in", () => {
    expect(() =>
      resolveE2ETarget({ E2E_BASE_URL: "https://staging.example.test" }),
    ).toThrow(/E2E_ALLOW_REMOTE/);
  });
  it("requires explicit staging origin configuration", () => {
    expect(() => resolveE2ETarget({})).toThrow(/E2E_BASE_URL/);
  });
});
