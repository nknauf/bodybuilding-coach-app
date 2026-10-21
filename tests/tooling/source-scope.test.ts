import { resolve } from "node:path";
import ts from "typescript";
import { getFileInfo } from "prettier";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const excluded = [
  "bodybuilding-coach-app/",
  ".codex/",
  ".omx/",
  ".agents/",
  ".claude/",
  ".windsurf/",
];

describe("canonical root tooling scope", () => {
  it("typechecks root source, tests and configuration, not nested or agent code", () => {
    const config = ts.readConfigFile(
      resolve(root, "tsconfig.json"),
      ts.sys.readFile,
    );
    expect(config.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    expect(parsed.errors).toEqual([]);
    const files = parsed.fileNames.map((file) => file.slice(root.length + 1));
    for (const prefix of excluded) {
      expect(files.filter((file) => file.startsWith(prefix))).toEqual([]);
    }
    for (const file of [
      "src/app/layout.tsx",
      "src/server/auth/scopes.ts",
      "prisma/seed.ts",
      "tests/tooling/source-scope.test.ts",
      "next.config.ts",
      "prisma.config.ts",
      "vitest.config.mts",
    ]) {
      expect(files).toContain(file);
    }
  });

  it.each(excluded)(
    "does not format preserved non-application tree %s",
    async (prefix) => {
      const info = await getFileInfo(resolve(root, prefix, "example.ts"), {
        ignorePath: resolve(root, ".prettierignore"),
      });
      expect(info.ignored).toBe(true);
    },
  );

  it("keeps root application formatting enabled", async () => {
    const info = await getFileInfo(resolve(root, "src/app/layout.tsx"), {
      ignorePath: resolve(root, ".prettierignore"),
    });
    expect(info.ignored).toBe(false);
  });
});
