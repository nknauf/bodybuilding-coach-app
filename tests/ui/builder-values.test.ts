import { describe, expect, it } from "vitest";
import { duplicateExercise, parseRepRange } from "../../src/lib/builder-values";

describe("workout prescription entry", () => {
  it.each(["8-10", "8–10", " 8 – 10 "])("accepts range %s", (value) => {
    expect(parseRepRange(value)).toEqual({ min: 8, max: 10 });
  });
  it("maps a single rep count to both stored bounds", () => {
    expect(parseRepRange("8")).toEqual({ min: 8, max: 8 });
    expect(parseRepRange("1–1000")).toEqual({ min: 1, max: 1000 });
  });
  it.each(["", "0", "1001", "10–8", "8–", "8.5", "8–10–12", "eight", "-8"])(
    "rejects invalid entry %s",
    (value) => {
      expect(parseRepRange(value)).toBeNull();
    },
  );
  it("duplicates prescriptions without reusing persisted assignment IDs", () => {
    const original = {
      id: "assignment",
      exerciseId: "catalog-exercise",
      notes: "Tempo",
      sets: [
        {
          id: "set",
          repsMin: "8",
          repsMax: "10",
          weight: "35",
          unit: "KG",
          effort: "7",
        },
      ],
    };
    const copy = duplicateExercise(original);
    expect(copy.id).toBeUndefined();
    expect(copy.exerciseId).toBe(original.exerciseId);
    expect(copy.sets[0]).toEqual({ ...original.sets[0], id: undefined });
    copy.sets[0].weight = "40";
    expect(original.sets[0].weight).toBe("35");
    expect(original.id).toBe("assignment");
    expect(original.sets[0].id).toBe("set");
  });
});
