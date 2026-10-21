import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  evaluateAuditPolicy,
  validateAuditReport,
} from "./lib/audit-policy.mjs";

function runNpmAudit(args) {
  const result = spawnSync("npm", args, { encoding: "utf8" });
  if (result.error || ![0, 1].includes(result.status))
    throw new Error("npm audit could not complete");
  return validateAuditReport(result.stdout, "npm audit response");
}

try {
  const audits = {
    full: runNpmAudit(["audit", "--package-lock-only", "--json"]),
    production: runNpmAudit([
      "audit",
      "--package-lock-only",
      "--omit=dev",
      "--json",
    ]),
  };
  evaluateAuditPolicy({
    ...audits,
    lock: fs.readFileSync("package-lock.json", "utf8"),
    exceptions: fs.readFileSync("security/audit-exceptions.json", "utf8"),
  });
  console.log("Security audit policy passed.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
