const APPROVED = "GHSA-vfj7-8cjw-p6xm";
const ADVISORY_URL = `https://github.com/advisories/${APPROVED}`;
const APPROVED_AT = "2026-10-20T02:17:37.000Z";
const EXPIRES_AT = "2026-11-03T02:17:37.000Z";
const APPROVED_NAMES = new Set([
  "@next/eslint-plugin-next",
  "@shadcn/registry",
  "@ts-morph/common",
  "braces",
  "eslint-config-next",
  "fast-glob",
  "micromatch",
  "shadcn",
  "ts-morph",
]);
const APPROVED_PATHS = {
  "@next/eslint-plugin-next": ["node_modules/@next/eslint-plugin-next"],
  "@shadcn/registry": ["node_modules/@shadcn/registry"],
  "@ts-morph/common": ["node_modules/@ts-morph/common"],
  braces: ["node_modules/braces"],
  "eslint-config-next": ["node_modules/eslint-config-next"],
  "fast-glob": [
    "node_modules/@shadcn/registry/node_modules/fast-glob",
    "node_modules/@ts-morph/common/node_modules/fast-glob",
    "node_modules/fast-glob",
    "node_modules/shadcn/node_modules/fast-glob",
  ],
  micromatch: ["node_modules/micromatch"],
  shadcn: ["node_modules/shadcn"],
  "ts-morph": ["node_modules/ts-morph"],
};

function fail(message) {
  throw new Error(`Security audit policy: ${message}`);
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseJson(value, label) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    fail(`${label} is invalid JSON`);
  }
}

export function validateAuditReport(report, label = "audit report") {
  report = parseJson(report, label);
  if (
    !isRecord(report) ||
    report.error ||
    !isRecord(report.metadata) ||
    !isRecord(report.metadata.vulnerabilities) ||
    !isRecord(report.vulnerabilities)
  )
    fail(`${label} has invalid npm audit schema`);
  const counts = report.metadata.vulnerabilities;
  const severities = ["info", "low", "moderate", "high", "critical"];
  if (
    ![...severities, "total"].every(
      (key) => Number.isInteger(counts[key]) && counts[key] >= 0,
    )
  )
    fail(`${label} has invalid vulnerability metadata`);
  for (const [name, vuln] of Object.entries(report.vulnerabilities)) {
    if (
      !vuln ||
      vuln.name !== name ||
      !severities.includes(vuln.severity) ||
      !Array.isArray(vuln.via) ||
      !Array.isArray(vuln.nodes) ||
      !vuln.nodes.length
    )
      fail(`${label} has malformed vulnerability entry ${name}`);
  }
  const entries = Object.values(report.vulnerabilities);
  const expected = severities.reduce(
    (sum, severity) => sum + counts[severity],
    0,
  );
  if (
    counts.total !== expected ||
    entries.length !== expected ||
    severities.some(
      (severity) =>
        entries.filter((vuln) => vuln.severity === severity).length !==
        counts[severity],
    )
  )
    fail(`${label} metadata does not match vulnerability findings`);
  return report;
}

function validateException(exception, lock, now) {
  if (
    !exception ||
    exception.schemaVersion !== 1 ||
    exception.approvedBy !== "nknauf" ||
    exception.advisory !== APPROVED ||
    exception.package !== "braces" ||
    exception.severity !== "high" ||
    exception.reason !== "dev-only braces chain"
  )
    fail("exception metadata is not the reviewed approval");
  const timestamp = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
  if (!timestamp(exception.approvedAt) || !timestamp(exception.expiresAt))
    fail("approval and expiry must be absolute UTC timestamps");
  if (
    exception.approvedAt !== APPROVED_AT ||
    exception.expiresAt !== EXPIRES_AT
  )
    fail("approval window differs from the reviewed immutable approval");
  const approvedAt = Date.parse(exception.approvedAt);
  const expiry = Date.parse(exception.expiresAt);
  if (!Number.isFinite(now) || now < approvedAt)
    fail("current time is invalid or precedes approval");
  if (expiry <= now || expiry > approvedAt + 14 * 24 * 60 * 60 * 1000)
    fail("exception is expired or exceeds the 14-day approval window");
  if (
    !Array.isArray(exception.paths) ||
    !exception.paths.length ||
    new Set(exception.paths).size !== exception.paths.length
  )
    fail("exception paths are invalid");
  for (const path of exception.paths) {
    if (
      !Object.values(APPROVED_PATHS).some((paths) => paths.includes(path)) ||
      !lock.packages?.[path] ||
      lock.packages[path].dev !== true
    )
      fail(`exception contains unknown or non-dev path ${path}`);
  }
  if (lock.packages["node_modules/braces"]?.version !== "3.0.3")
    fail("approved braces version no longer matches the reviewed version");
}

function validateFindings(report, lock) {
  const findings = report.vulnerabilities;
  if (Object.keys(findings).length === 0) return [];
  const visiting = new Set();
  const visited = new Set();
  const visit = (name) => {
    if (visiting.has(name)) fail(`cyclic via chain at ${name}`);
    if (visited.has(name)) return;
    const vuln = findings[name];
    if (!vuln) fail(`missing via node ${name}`);
    if (!vuln.via.length) fail(`empty via chain for ${name}`);
    visiting.add(name);
    for (const edge of vuln.via) {
      if (typeof edge === "string") visit(edge);
      else if (
        !edge ||
        edge.url !== ADVISORY_URL ||
        edge.severity !== "high" ||
        edge.name !== "braces" ||
        edge.dependency !== "braces"
      )
        fail(`unexpected advisory leaf for ${name}`);
    }
    visiting.delete(name);
    visited.add(name);
  };

  for (const [name, vuln] of Object.entries(findings)) {
    if (vuln.severity !== "high" || !APPROVED_NAMES.has(name))
      fail(`unapproved ${vuln.severity} finding: ${name}`);
    if (
      !APPROVED_PATHS[name] ||
      vuln.nodes.length !== APPROVED_PATHS[name].length ||
      vuln.nodes.some((path) => !APPROVED_PATHS[name].includes(path))
    )
      fail(`unexpected paths for ${name}`);
    for (const path of vuln.nodes) {
      const node = lock.packages?.[path];
      const basename = path.slice(
        path.lastIndexOf("node_modules/") + "node_modules/".length,
      );
      if (!node || node.dev !== true || (node.name || basename) !== name)
        fail(
          `finding ${name} has unknown, mismatched, or non-dev node ${path}`,
        );
    }
    visit(name);
  }
  return Object.keys(findings);
}

export function evaluateAuditPolicy({
  full,
  production,
  lock,
  exceptions,
  now = Date.now(),
}) {
  full = validateAuditReport(full, "full audit");
  production = validateAuditReport(production, "production audit");
  lock = parseJson(lock, "lockfile");
  exceptions = parseJson(exceptions, "exceptions");
  if (
    !isRecord(lock) ||
    !isRecord(lock.packages) ||
    ![2, 3].includes(lock.lockfileVersion)
  )
    fail("lockfile schema is unsupported");
  if (
    production.metadata.vulnerabilities.total ||
    Object.keys(production.vulnerabilities).length
  )
    fail("production dependencies have vulnerabilities");
  const allowed = validateFindings(full, lock);
  if (allowed.length) {
    if (!Array.isArray(exceptions) || exceptions.length !== 1)
      fail("exception list must contain exactly the reviewed exception");
    const exception = exceptions[0];
    validateException(exception, lock, now);
    const findingPaths = [
      ...new Set(Object.values(APPROVED_PATHS).flat()),
    ].sort();
    if (
      JSON.stringify([...exception.paths].sort()) !==
      JSON.stringify(findingPaths)
    )
      fail("exception paths differ from the exact reviewed allowlist");
  }
  return { ok: true, allowed };
}
