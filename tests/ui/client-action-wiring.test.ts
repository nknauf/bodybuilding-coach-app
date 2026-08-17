import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("authenticated Today action wiring", () => {
  it("opens workouts and quick-completes meals with the meal action", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../../src/app/client/page.tsx", import.meta.url)),
      "utf8",
    );
    const workoutBlock = source.slice(
      source.indexOf("...report.workouts.map"),
      source.indexOf("...report.meals.map"),
    );
    const mealBlock = source.slice(
      source.indexOf("...report.meals.map"),
      source.indexOf("...report.supplements.map"),
    );
    expect(workoutBlock).toContain("action: null");
    expect(workoutBlock).not.toContain("completeMealAction.bind");
    expect(mealBlock).toContain("completeMealAction.bind(null, event.id)");
  });
});
