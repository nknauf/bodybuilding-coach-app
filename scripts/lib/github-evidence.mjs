export const requiredChecks = [
  "Quality checks",
  "Production build",
  "Dependency policy",
];
export const checkWorkflows = {
  "Quality checks": ".github/workflows/quality.yml",
  "Production build": ".github/workflows/quality.yml",
  "Dependency policy": ".github/workflows/dependency-policy.yml",
  "Day database checks": ".github/workflows/database-checks.yml",
};

/** Validate live GitHub data, not user-authored approval records. */
export function verifyChecks(sha, checks, required = requiredChecks) {
  if (!/^[a-f0-9]{40}$/.test(sha) || !Array.isArray(checks)) {
    throw new Error("Expected a full commit SHA and GitHub check runs.");
  }
  return required.map((name) => {
    const matches = checks
      .filter(
        (check) =>
          check.name === name &&
          check.head_sha === sha &&
          check.app?.slug === "github-actions" &&
          check.app?.id === 15368,
      )
      .sort((a, b) => b.id - a.id);
    const latest = matches[0];
    if (
      !latest ||
      latest.status !== "completed" ||
      latest.conclusion !== "success"
    ) {
      throw new Error(`Missing or unsuccessful trusted check: ${name}`);
    }
    return { name, id: latest.id, url: latest.html_url };
  });
}

export function workflowRunIdFromCheck(check, repository) {
  let url;
  try {
    url = new URL(check.details_url);
  } catch {
    throw new Error(`Check has no trusted workflow URL: ${check.name}`);
  }
  const match = url.pathname.match(
    new RegExp(`^/${repository}/actions/runs/(\\d+)(?:/job/\\d+)?$`),
  );
  if (url.origin !== "https://github.com" || url.search || url.hash || !match) {
    throw new Error(`Check has no trusted workflow URL: ${check.name}`);
  }
  return match[1];
}

export function verifyWorkflowRun(check, run, repository) {
  const expectedPath = checkWorkflows[check.name];
  if (
    !expectedPath ||
    run?.id?.toString() !== workflowRunIdFromCheck(check, repository) ||
    run.path !== expectedPath ||
    run.head_sha !== check.head_sha ||
    run.check_suite_id !== check.check_suite?.id ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    ![
      "pull_request",
      "push",
      "merge_group",
      "workflow_dispatch",
      ...(check.name === "Dependency policy" ? ["schedule"] : []),
    ].includes(run.event)
  ) {
    throw new Error(
      `Untrusted or unsuccessful workflow provenance: ${check.name}`,
    );
  }
}
