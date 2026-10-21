import {
  requiredChecks,
  verifyChecks,
  verifyWorkflowRun,
  workflowRunIdFromCheck,
} from "./lib/github-evidence.mjs";

const repository = "nknauf/bodybuilding-coach-app";
const sha = process.argv[2];
const merged = process.argv.includes("--merged");
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
async function api(path) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${path}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok)
    throw new Error(`GitHub evidence unavailable (${response.status}).`);
  return response.json();
}

try {
  if (!/^[a-f0-9]{40}$/.test(sha ?? "")) {
    throw new Error("Usage: npm run verify:github -- <full-sha> [--merged]");
  }
  if (merged) {
    const current = await api("git/ref/heads/main");
    if (current.object?.sha !== sha) {
      throw new Error(
        "Release SHA is not current main; select and review the current release candidate.",
      );
    }
  }
  const checks = [];
  for (let page = 1; ; page++) {
    if (page > 100) throw new Error("Check-run pagination limit reached.");
    const data = await api(
      `commits/${sha}/check-runs?filter=all&per_page=100&page=${page}`,
    );
    if (!Array.isArray(data.check_runs))
      throw new Error("Malformed GitHub check-run response.");
    checks.push(...data.check_runs);
    if (data.check_runs.length < 100) break;
  }
  const verified = verifyChecks(
    sha,
    checks,
    merged ? [...requiredChecks, "Day database checks"] : requiredChecks,
  );
  for (const item of verified) {
    const check = checks.find((candidate) => candidate.id === item.id);
    const runId = workflowRunIdFromCheck(check, repository);
    verifyWorkflowRun(check, await api(`actions/runs/${runId}`), repository);
  }
  console.log(
    JSON.stringify(
      {
        repository,
        sha,
        checkedAt: new Date().toISOString(),
        stage: "hosted-checks-passed",
        checks: verified,
        releaseApproved: false,
        limitations:
          "Requires separate fresh dependency-policy run, independent reviews, authenticated preview/tenant tests, deployment identity verification and human approval.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "GitHub verification failed.",
  );
  process.exitCode = 1;
}
