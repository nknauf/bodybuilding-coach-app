import { describe, expect, it } from "vitest";
import { workoutSchema, mealSchema } from "@/server/validation/schemas";
import { userStatusForClientStatus } from "@/server/domain/client-lifecycle";

const clientId = "20000000-0000-4000-8000-000000000001";
const exerciseA = "30000000-0000-4000-8000-000000000001";
const exerciseB = "30000000-0000-4000-8000-000000000002";

describe("prototype workflow validation", () => {
  it("accepts an ordered multi-exercise workout with multiple sets", () => {
    const result = workoutSchema.parse({
      clientId,
      name: "Full body",
      scheduledAt: "2026-08-06T09:00",
      exercises: [
        { exerciseId: exerciseA, expectedReps: [8, 8, 8] },
        { exerciseId: exerciseB, expectedReps: [10, 10] },
      ],
    });
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0]?.expectedReps).toEqual([8, 8, 8]);
  });

  it("rejects the whole workout payload when any assigned set is invalid", () => {
    expect(() =>
      workoutSchema.parse({
        clientId,
        name: "Invalid workout",
        scheduledAt: "2026-08-06T09:00",
        exercises: [
          { exerciseId: exerciseA, expectedReps: [8] },
          { exerciseId: exerciseB, expectedReps: [0] },
        ],
      }),
    ).toThrow();
  });

  it("persists structured exact and ranged rep targets", () => {
    const result = workoutSchema.parse({
      clientId,
      name: "Push A",
      scheduledAt: "2026-08-06T09:00",
      exercises: [
        {
          exerciseId: exerciseA,
          sets: [
            {
              targetRepsMin: 8,
              targetRepsMax: 8,
              targetWeight: 225,
              targetWeightUnit: "LB",
              targetEffort: 8,
            },
            { targetRepsMin: 8, targetRepsMax: 10 },
          ],
        },
      ],
    });
    expect(result.exercises[0]?.sets).toEqual([
      {
        targetRepsMin: 8,
        targetRepsMax: 8,
        targetWeight: 225,
        targetWeightUnit: "LB",
        targetEffort: 8,
      },
      { targetRepsMin: 8, targetRepsMax: 10 },
    ]);
  });

  it("rejects an inverted rep range", () => {
    expect(() =>
      workoutSchema.parse({
        clientId,
        name: "Invalid range",
        scheduledAt: "2026-08-06T09:00",
        exercises: [
          {
            exerciseId: exerciseA,
            sets: [{ targetRepsMin: 12, targetRepsMax: 8 }],
          },
        ],
      }),
    ).toThrow();
  });

  it("keeps meal calories optional while accepting ordered ingredients", () => {
    const result = mealSchema.parse({
      clientId,
      name: "Lunch",
      scheduledAt: "2026-08-06T12:00",
      expectedProteinGrams: "40",
      ingredients: [
        { name: "Chicken", amount: "180 g" },
        { name: "Rice", amount: "" },
      ],
    });
    expect(result.expectedCalories).toBeUndefined();
    expect(result.ingredients).toHaveLength(2);
  });
});

describe("client lifecycle synchronization", () => {
  it.each([
    ["INVITED", "INVITED"],
    ["ACTIVE", "ACTIVE"],
    ["INACTIVE", "DISABLED"],
    ["ARCHIVED", "ARCHIVED"],
  ] as const)("maps %s client state to %s user state", (client, user) => {
    expect(userStatusForClientStatus(client)).toBe(user);
  });
});
