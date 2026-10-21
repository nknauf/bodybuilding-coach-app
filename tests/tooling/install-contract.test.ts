import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const manifest = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

describe("reproducible dependency installation", () => {
  it("keeps manifest dependencies synchronized with the lockfile", () => {
    expect(lock.packages[""].dependencies).toEqual(manifest.dependencies);
    expect(lock.packages[""].devDependencies).toEqual(manifest.devDependencies);
  });

  it("uses the same supported Node runtime locally and in CI", () => {
    expect(read(".nvmrc").trim()).toBe(manifest.engines.node);
    expect(read(".github/workflows/quality.yml")).toContain(
      'node-version-file: ".nvmrc"',
    );
  });

  it("keeps the Next.js framework and lint configuration aligned", () => {
    expect(manifest.dependencies.next).toBe(
      manifest.devDependencies["eslint-config-next"],
    );
  });

  it("pins the tested npm resolver in CI and package metadata", () => {
    expect(manifest.packageManager).toBe(`npm@${manifest.engines.npm}`);
    expect(read(".github/workflows/quality.yml")).toContain(
      `npm install --global npm@${manifest.engines.npm}`,
    );
    expect(lock.packages[""].engines).toEqual(manifest.engines);
  });

  it("retains Prisma generation and an explicit security gate", () => {
    expect(manifest.scripts.postinstall).toBe("prisma generate");
    expect(read(".github/workflows/dependency-policy.yml")).toContain(
      "run: npm run security:audit",
    );
  });
});
