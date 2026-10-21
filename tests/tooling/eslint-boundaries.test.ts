import { resolve } from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: resolve(import.meta.dirname, "../..") });

describe("root lint boundaries", () => {
  beforeAll(async () => {
    await eslint.calculateConfigForFile("src/app/layout.tsx");
  }, 30_000);

  it.each([
    ".codex/skills/.system/example/scripts/tool.cjs",
    ".omx/runtime/example/plugins/cache/example/tool.ts",
    "bodybuilding-coach-app/src/app/layout.tsx",
    ".codex/project-tool.ts",
    ".codex/skills/project/scripts/tool.ts",
    ".omx/project-tool.ts",
    ".agents/skills/project/scripts/tool.ts",
    ".claude/skills/project/scripts/tool.ts",
    ".windsurf/skills/project/scripts/tool.ts",
  ])("excludes non-application file %s", async (file) => {
    expect(await eslint.isPathIgnored(file)).toBe(true);
  });

  it.each([
    "src/app/layout.tsx",
    "src/server/auth/scopes.ts",
    "tests/integration/tenant-database.test.ts",
    "tests/tooling/eslint-boundaries.test.ts",
    "prisma/seed.ts",
    "eslint.config.mjs",
    "next.config.ts",
    "vitest.config.mts",
  ])("keeps owned or non-cache code covered: %s", async (file) => {
    expect(await eslint.isPathIgnored(file)).toBe(false);
    const config = await eslint.calculateConfigForFile(file);
    expect(config?.rules?.["@typescript-eslint/no-unused-vars"]).toBeDefined();
  });
});
