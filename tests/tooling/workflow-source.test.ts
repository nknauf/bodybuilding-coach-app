import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const assertion = 'test "$(git rev-parse HEAD)" = "$EXPECTED_SOURCE_SHA"';
const candidate = "${{ github.event.pull_request.head.sha || github.sha }}";

describe("workflow immutable source identity", () => {
  it.each([
    ["quality.yml", candidate, 2],
    ["dependency-policy.yml", candidate, 1],
    ["staging-smoke.yml", "${{ github.sha }}", 1],
  ] as const)("pins and asserts every checkout in %s", (file, sha, count) => {
    const source = readFileSync(
      resolve(root, ".github/workflows", file),
      "utf8",
    );
    const checkouts = source.split(/      - uses: actions\/checkout@/).slice(1);
    expect(checkouts).toHaveLength(count);
    for (const checkout of checkouts) {
      const beforeNextStep = checkout.split(
        /      - uses: actions\/setup-node@/,
      )[0];
      expect(beforeNextStep).toContain(`          ref: ${sha}`);
      expect(beforeNextStep).toContain(`          EXPECTED_SOURCE_SHA: ${sha}`);
      expect(beforeNextStep).toContain(`        run: ${assertion}`);
      expect(beforeNextStep).not.toContain("npm ");
    }
  });

  it("rejects a mismatched SHA and accepts the checked-out SHA", () => {
    const actual = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).stdout.trim();
    for (const expected of [actual, "0".repeat(40)]) {
      const result = spawnSync("sh", ["-c", assertion], {
        cwd: root,
        env: { ...process.env, EXPECTED_SOURCE_SHA: expected },
      });
      expect(result.status).toBe(expected === actual ? 0 : 1);
    }
  });
});
