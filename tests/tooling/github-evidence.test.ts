import { describe, expect, it } from "vitest";
import {
  verifyChecks,
  verifyWorkflowRun,
  workflowRunIdFromCheck,
} from "../../scripts/lib/github-evidence.mjs";

const sha = "a".repeat(40);
const check = {
  name: "Quality checks",
  id: 2,
  head_sha: sha,
  app: { slug: "github-actions", id: 15368 },
  check_suite: { id: 17 },
  details_url:
    "https://github.com/nknauf/bodybuilding-coach-app/actions/runs/4/job/5",
  status: "completed",
  conclusion: "success",
  html_url: "https://github.com/check/2",
};
const verify = (checks: unknown[]) =>
  verifyChecks(sha, checks, ["Quality checks"]);

describe("exact revision GitHub evidence", () => {
  it("accepts a successful check for the exact SHA and expected app", () => {
    expect(verify([check])).toHaveLength(1);
  });
  it("rejects missing, skipped, stale, and spoofed evidence", () => {
    for (const checks of [
      [],
      [{ ...check, conclusion: "skipped" }],
      [{ ...check, head_sha: "b".repeat(40) }],
      [{ ...check, app: { slug: "github-actions", id: 1 } }],
      [{ ...check, status: "in_progress" }],
    ])
      expect(() => verify(checks)).toThrow();
  });
  it("does not use an older successful attempt over a newer failure", () => {
    expect(() =>
      verify([check, { ...check, id: 3, conclusion: "failure" }]),
    ).toThrow();
  });
  it("requires the expected workflow, run, event, SHA and check suite", () => {
    const target = {
      ...check,
      id: 9,
      details_url:
        "https://github.com/nknauf/bodybuilding-coach-app/actions/runs/4/job/9",
    };
    const run = {
      id: 4,
      path: ".github/workflows/quality.yml",
      head_sha: sha,
      check_suite_id: 17,
      status: "completed",
      conclusion: "success",
      event: "pull_request",
    };
    expect(
      workflowRunIdFromCheck(target, "nknauf/bodybuilding-coach-app"),
    ).toBe("4");
    expect(() =>
      verifyWorkflowRun(target, run, "nknauf/bodybuilding-coach-app"),
    ).not.toThrow();
    for (const invalid of [
      { ...run, path: ".github/workflows/other.yml" },
      { ...run, head_sha: "b".repeat(40) },
      { ...run, check_suite_id: 18 },
      { ...run, event: "schedule" },
      { ...run, id: 5 },
    ]) {
      expect(() =>
        verifyWorkflowRun(target, invalid, "nknauf/bodybuilding-coach-app"),
      ).toThrow();
    }
  });
  it("allows scheduled runs only for the dependency audit workflow", () => {
    const target = {
      ...check,
      name: "Dependency policy",
    };
    const run = {
      id: 4,
      path: ".github/workflows/dependency-policy.yml",
      head_sha: sha,
      check_suite_id: 17,
      status: "completed",
      conclusion: "success",
      event: "schedule",
    };
    expect(() =>
      verifyWorkflowRun(target, run, "nknauf/bodybuilding-coach-app"),
    ).not.toThrow();
    expect(() =>
      verifyWorkflowRun(
        { ...target, name: "Quality checks" },
        { ...run, path: ".github/workflows/quality.yml" },
        "nknauf/bodybuilding-coach-app",
      ),
    ).toThrow();
  });
});
