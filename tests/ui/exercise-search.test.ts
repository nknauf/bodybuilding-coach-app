import { describe, expect, it } from "vitest";
import { rankExercises } from "../../src/lib/exercise-search";

const catalog = [
  { id: "1", name: "Incline Dumbbell Press" },
  { id: "2", name: "Dumbbell Press" },
  { id: "3", name: "Incline Barbell Press" },
  { id: "4", name: "Chest Supported Cable Row" },
  { id: "5", name: "Cable Row" },
  { id: "6", name: "Incline Dumbbell Fly" },
];

describe("exercise search", () => {
  it("ranks exact, prefix, word, and fuzzy matches", () => {
    expect(rankExercises(catalog, "incline db press")[0]?.id).toBe("1");
    expect(rankExercises(catalog, "incline dumbbell press")[0]?.id).toBe("1");
    expect(rankExercises(catalog, "dumbbell press")[0]?.id).toBe("2");
    expect(rankExercises(catalog, "chest cable row")[0]?.id).toBe("4");
    expect(rankExercises(catalog, "inclne dumbell press")[0]?.id).toBe("1");
  });

  it("returns several useful results while excluding unrelated exercises", () => {
    const matches = rankExercises(catalog, "press");
    expect(matches.map((match) => match.id)).toEqual(["2", "3", "1"]);
    expect(rankExercises(catalog, "")).toEqual([]);
  });
});
