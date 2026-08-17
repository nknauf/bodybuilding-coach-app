import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
    "utf8",
  );

describe("workout creation and client home regressions", () => {
  it("keeps multi-exercise and inline custom-exercise controls in the authenticated builder", () => {
    const builder = source("src/components/coach-schedule-forms.tsx");
    const action = source("src/app/actions/coach.ts");

    expect(builder).toContain("<Plus /> Add exercise");
    expect(builder).toContain("Create &quot;{search.trim()}&quot;");
    expect(builder).toContain("result.createdExercise.id");
    expect(action).toContain("createdExercise: {");
  });

  it("stacks demo Today actions above the weekly calendar at every breakpoint", () => {
    const clientDemo = source("src/components/demo/client-demo.tsx");

    expect(clientDemo).toContain('className="flex flex-col gap-6"');
    expect(clientDemo).toContain('className="order-1"');
    expect(clientDemo).toContain('id="calendar" className="order-2"');
    expect(clientDemo).not.toContain("lg:grid-cols-[1.4fr_.8fr]");
  });
});
