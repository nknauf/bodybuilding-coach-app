import { describe, expect, it } from "vitest";
import { createDemoState, demoReducer, readDemoState } from "@/demo/state";

describe("anonymous demo state", () => {
  it("seeds a useful current-week roster without production identities", () => {
    const state = createDemoState(
      new Date("2026-08-19T12:00:00-04:00"),
      "America/New_York",
    );
    expect(state.clients).toHaveLength(3);
    expect(state.workouts.some((workout) => workout.name === "Push A")).toBe(
      true,
    );
    expect(state.meals.length).toBeGreaterThanOrEqual(3);
    expect(state.supplements.length).toBeGreaterThanOrEqual(3);
    expect(state.bodyweights).toHaveLength(60);
    expect(JSON.stringify(state)).not.toContain("@vt.edu");
  });

  it("shares coach scheduling and client logging through one state", () => {
    const initial = createDemoState();
    const workout = {
      id: "new-workout",
      clientId: initial.primaryClientId,
      name: "Upper B",
      scheduledAt: new Date().toISOString(),
      status: "SCHEDULED" as const,
      exercises: [
        {
          id: "new-assignment",
          exerciseId: "bench",
          name: "Barbell Bench Press",
          previous: [],
          sets: [
            {
              id: "new-set",
              targetRepsMin: 8,
              targetRepsMax: 10,
              unit: "LB" as const,
            },
          ],
        },
        {
          id: "second-assignment",
          exerciseId: "row",
          name: "Chest-Supported Row",
          previous: [],
          sets: [
            {
              id: "second-set",
              targetRepsMin: 10,
              targetRepsMax: 12,
              unit: "LB" as const,
            },
          ],
        },
      ],
    };
    const scheduled = demoReducer(initial, { type: "ADD_WORKOUT", workout });
    const logged = demoReducer(scheduled, {
      type: "LOG_SET",
      workoutId: workout.id,
      setId: "new-set",
      reps: 9,
      weight: 140,
      status: "COMPLETED",
    });
    expect(
      logged.workouts.find((item) => item.id === workout.id)?.exercises[0]
        ?.sets[0],
    ).toMatchObject({ actualReps: 9, actualWeight: 140, status: "COMPLETED" });
    expect(
      logged.workouts
        .find((item) => item.id === workout.id)
        ?.exercises.map((exercise) => exercise.name),
    ).toEqual(["Barbell Bench Press", "Chest-Supported Row"]);
  });

  it("completes meals and supplements without mutating the input state", () => {
    const initial = createDemoState();
    const mealId = initial.meals[0]!.id;
    const supplementId = initial.supplements[0]!.id;
    const mealState = demoReducer(initial, {
      type: "COMPLETE_MEAL",
      mealId,
      at: "2026-08-19T17:00:00.000Z",
    });
    const finalState = demoReducer(mealState, {
      type: "COMPLETE_SUPPLEMENT",
      supplementId,
      at: "2026-08-19T17:01:00.000Z",
    });
    expect(initial.meals[0]?.completedAt).toBeUndefined();
    expect(
      finalState.meals.find((meal) => meal.id === mealId)?.completedAt,
    ).toBeTruthy();
    expect(
      finalState.supplements.find((item) => item.id === supplementId)
        ?.completedAt,
    ).toBeTruthy();
  });

  it("restores valid session JSON and rejects stale or corrupted storage", () => {
    const state = createDemoState();
    expect(readDemoState(JSON.stringify(state))?.primaryClientId).toBe(
      state.primaryClientId,
    );
    expect(readDemoState("not json")).toBeNull();
    expect(readDemoState(JSON.stringify({ ...state, version: 2 }))).toBeNull();
  });
});
