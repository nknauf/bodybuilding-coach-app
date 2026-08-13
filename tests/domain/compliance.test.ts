import { describe, expect, it } from "vitest";
import { calculateCompliance } from "@/server/domain/compliance";

describe("calculateCompliance", () => {
  it("returns null, not zero, when there are no assignments", () => {
    expect(calculateCompliance({}).overall).toBeNull();
  });

  it("normalizes weights when only one category is assigned", () => {
    expect(
      calculateCompliance({
        meals: [{ status: "COMPLETED" }, { status: "MISSED" }],
      }).overall,
    ).toBe(0.5);
  });

  it.each([
    {
      name: "partial workout",
      workouts: [
        {
          expectedAssignedSets: 4,
          completedAssignedSets: 2,
          status: "OVERDUE" as const,
        },
      ],
      expected: 0.5,
    },
    {
      name: "skipped sets do not count",
      workouts: [
        {
          expectedAssignedSets: 3,
          completedAssignedSets: 1,
          status: "COMPLETED" as const,
        },
      ],
      expected: 1 / 3,
    },
    {
      name: "extra sets cannot exceed 100%",
      workouts: [
        {
          expectedAssignedSets: 2,
          completedAssignedSets: 5,
          status: "COMPLETED" as const,
        },
      ],
      expected: 1,
    },
  ])("$name", ({ workouts, expected }) => {
    expect(calculateCompliance({ workouts }).workout.rate).toBeCloseTo(
      expected,
    );
  });

  it("applies the 50/35/15 mixed-category weighting", () => {
    const result = calculateCompliance({
      workouts: [
        {
          expectedAssignedSets: 4,
          completedAssignedSets: 2,
          status: "OVERDUE",
        },
      ],
      meals: [{ status: "COMPLETED" }, { status: "MISSED" }],
      supplements: [{ status: "COMPLETED" }],
    });
    expect(result.overall).toBeCloseTo(0.575);
  });

  it.each([
    ["0%", "MISSED", 0],
    ["100%", "COMPLETED", 1],
    ["overdue is not completed", "OVERDUE", 0],
  ] as const)("%s", (_name, status, expected) => {
    expect(calculateCompliance({ meals: [{ status }] }).overall).toBe(expected);
  });
});
