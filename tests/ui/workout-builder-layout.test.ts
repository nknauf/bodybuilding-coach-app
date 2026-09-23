import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
    "utf8",
  );

describe("workout creation and client home regressions", () => {
  it("keeps the workout form mounted under the creator sheet and uses the existing actions", () => {
    const builder = source("src/components/coach-schedule-forms.tsx");
    const workspace = source("src/components/coach-client-workspace.tsx");
    const action = source("src/app/actions/coach.ts");

    expect(builder).toContain("<Plus /> Add exercise");
    expect(builder).toContain("open={creating}");
    expect(builder).toContain("setCreatorName(search)");
    expect(builder).toContain("selectExercise(result.createdExercise)");
    expect(builder).toContain("rankExercises(exercises, search)");
    expect(workspace).toContain("h-[min(90vh,900px)]");
    expect(workspace).toContain("sm:max-w-[1050px]");
    expect(workspace).toContain("disablePointerDismissal");
    expect(workspace).toContain("Discard this unsaved workout?");
    expect(action).toContain("createdExercise: {");
    expect(action).toContain("revalidatePath(`/coach/clients/${clientId}`)");
  });

  it("stacks demo Today actions above the weekly calendar at every breakpoint", () => {
    const clientDemo = source("src/components/demo/client-demo.tsx");

    expect(clientDemo).toContain('className="flex flex-col gap-6"');
    expect(clientDemo).toContain('className="order-1"');
    expect(clientDemo).toContain('id="calendar" className="order-2"');
    expect(clientDemo).not.toContain("lg:grid-cols-[1.4fr_.8fr]");
  });
});
