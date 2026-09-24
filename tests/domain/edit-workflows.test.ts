import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/authorization";

const mocks = vi.hoisted(() => {
  const tx = {
    workout: { findFirst: vi.fn(), update: vi.fn() },
    workoutExercise: { update: vi.fn(), create: vi.fn(), delete: vi.fn() },
    assignedSet: { update: vi.fn(), create: vi.fn(), delete: vi.fn() },
    workoutSetLog: { count: vi.fn() },
    exercise: { findMany: vi.fn() },
    mealEvent: { findFirst: vi.fn(), update: vi.fn() },
    mealIngredient: { deleteMany: vi.fn(), createMany: vi.fn() },
    supplementEvent: { findFirst: vi.fn(), update: vi.fn() },
  };
  return { tx, audit: vi.fn(), accessible: vi.fn() };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({
  db: {
    $transaction: (callback: (tx: typeof mocks.tx) => unknown) =>
      callback(mocks.tx),
  },
}));
vi.mock("@/server/auth/scopes", () => ({
  requireAccessibleClient: mocks.accessible,
}));
vi.mock("@/server/audit/write-audit", () => ({ writeAudit: mocks.audit }));

import {
  updateWorkout,
  updateMeal,
  updateSupplement,
} from "@/server/services/coach";

const actor: Actor = {
  id: "10000000-0000-4000-8000-000000000001",
  clerkUserId: "clerk-a",
  role: "COACH",
  status: "ACTIVE",
  timezone: "UTC",
  coachProfileId: "20000000-0000-4000-8000-000000000001",
  clientProfileId: null,
};
const clientId = "30000000-0000-4000-8000-000000000001";
const workoutId = "40000000-0000-4000-8000-000000000001";
const exerciseId = "50000000-0000-4000-8000-000000000001";
const workoutExerciseId = "60000000-0000-4000-8000-000000000001";
const setId = "70000000-0000-4000-8000-000000000001";
const mealId = "80000000-0000-4000-8000-000000000001";
const supplementId = "90000000-0000-4000-8000-000000000001";
const oldDate = new Date("2026-09-24T13:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.accessible.mockResolvedValue({
    id: clientId,
    user: { timezone: "America/New_York" },
  });
  mocks.audit.mockResolvedValue(undefined);
  mocks.tx.exercise.findMany.mockResolvedValue([
    { id: exerciseId, name: "Squat" },
  ]);
  mocks.tx.workoutSetLog.count.mockResolvedValue(0);
  mocks.tx.workout.findFirst.mockResolvedValue({
    id: workoutId,
    clientId,
    coachId: actor.coachProfileId,
    name: "Old",
    scheduledAt: oldDate,
    exercises: [
      {
        id: workoutExerciseId,
        exerciseId,
        exerciseNameSnapshot: "Squat",
        orderIndex: 0,
        archivedAt: null,
        setLogs: [],
        assignedSets: [{ id: setId, orderIndex: 0, archivedAt: null }],
      },
    ],
  });
  mocks.tx.workout.update.mockImplementation(async ({ data }) => ({
    id: workoutId,
    ...data,
  }));
  mocks.tx.mealEvent.findFirst.mockResolvedValue({
    id: mealId,
    name: "Old meal",
    scheduledAt: oldDate,
  });
  mocks.tx.mealEvent.update.mockImplementation(async ({ data }) => ({
    id: mealId,
    ...data,
  }));
  mocks.tx.supplementEvent.findFirst.mockResolvedValue({
    id: supplementId,
    name: "Old supplement",
    scheduledAt: oldDate,
  });
  mocks.tx.supplementEvent.update.mockImplementation(async ({ data }) => ({
    id: supplementId,
    ...data,
  }));
});

describe("coach edit services", () => {
  it("updates the same workout and retained rows with client-local time", async () => {
    const updated = await updateWorkout(actor, {
      clientId,
      workoutId,
      name: "New",
      scheduledAt: "2026-09-24T23:30",
      exercises: [
        {
          id: workoutExerciseId,
          exerciseId,
          notes: "Pause",
          sets: [
            {
              id: setId,
              targetRepsMin: 6,
              targetRepsMax: 8,
              targetWeight: 225,
              targetEffort: 8,
            },
          ],
        },
      ],
    });
    expect(updated.id).toBe(workoutId);
    expect(mocks.tx.workout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: workoutId },
        data: expect.objectContaining({
          name: "New",
          scheduledAt: new Date("2026-09-25T03:30:00.000Z"),
        }),
      }),
    );
    expect(mocks.tx.workoutExercise.create).not.toHaveBeenCalled();
    expect(mocks.tx.assignedSet.create).not.toHaveBeenCalled();
    expect(mocks.tx.assignedSet.delete).not.toHaveBeenCalled();
    expect(mocks.tx.assignedSet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: setId },
        data: expect.objectContaining({ targetWeight: 225, targetEffort: 8 }),
      }),
    );
  });

  it("keeps retained child IDs across repeated edits and creates only a duplicated set", async () => {
    const payload = {
      clientId,
      workoutId,
      name: "Repeat",
      scheduledAt: "2026-09-24T09:00",
      exercises: [
        {
          id: workoutExerciseId,
          exerciseId,
          sets: [{ id: setId, targetRepsMin: 8, targetRepsMax: 8 }],
        },
      ],
    };
    await updateWorkout(actor, payload);
    await updateWorkout(actor, payload);
    expect(mocks.tx.workoutExercise.create).not.toHaveBeenCalled();
    expect(mocks.tx.assignedSet.create).not.toHaveBeenCalled();
    await updateWorkout(actor, {
      ...payload,
      exercises: [
        {
          ...payload.exercises[0],
          sets: [
            payload.exercises[0].sets[0],
            { targetRepsMin: 8, targetRepsMax: 8 },
          ],
        },
      ],
    });
    expect(mocks.tx.assignedSet.create).toHaveBeenCalledTimes(1);
  });

  it("archives a removed logged set and keeps the active exercise", async () => {
    mocks.tx.workoutSetLog.count.mockResolvedValue(1);
    await updateWorkout(actor, {
      clientId,
      workoutId,
      name: "New",
      scheduledAt: "2026-09-24T09:00",
      exercises: [
        {
          id: workoutExerciseId,
          exerciseId,
          sets: [{ targetRepsMin: 10, targetRepsMax: 10 }],
        },
      ],
    });
    expect(mocks.tx.assignedSet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: setId },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(mocks.tx.assignedSet.delete).not.toHaveBeenCalled();
    expect(mocks.tx.assignedSet.create).toHaveBeenCalledTimes(1);
  });

  it("removes unlogged rows and creates reordered exercise and set rows", async () => {
    const secondExercise = "50000000-0000-4000-8000-000000000002";
    mocks.tx.exercise.findMany.mockResolvedValue([
      { id: exerciseId, name: "Squat" },
      { id: secondExercise, name: "Press" },
    ]);
    await updateWorkout(actor, {
      clientId,
      workoutId,
      name: "Reordered",
      scheduledAt: "2026-09-24T09:00",
      exercises: [
        {
          exerciseId: secondExercise,
          sets: [{ targetRepsMin: 5, targetRepsMax: 5 }],
        },
        {
          id: workoutExerciseId,
          exerciseId,
          notes: "Slow eccentric",
          sets: [{ targetRepsMin: 10, targetRepsMax: 12 }],
        },
      ],
    });
    expect(mocks.tx.workoutExercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          exerciseId: secondExercise,
          orderIndex: 0,
        }),
      }),
    );
    expect(mocks.tx.workoutExercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: workoutExerciseId },
        data: expect.objectContaining({
          orderIndex: 1,
          coachNotes: "Slow eccentric",
        }),
      }),
    );
    expect(mocks.tx.assignedSet.delete).toHaveBeenCalledWith({
      where: { id: setId },
    });
    expect(mocks.tx.assignedSet.create).toHaveBeenCalledTimes(1);
  });

  it("archives a removed exercise with logs", async () => {
    const secondExercise = "50000000-0000-4000-8000-000000000002";
    mocks.tx.exercise.findMany.mockResolvedValue([
      { id: secondExercise, name: "Press" },
    ]);
    mocks.tx.workoutSetLog.count.mockResolvedValue(1);
    await updateWorkout(actor, {
      clientId,
      workoutId,
      name: "Press day",
      scheduledAt: "2026-09-24T09:00",
      exercises: [
        {
          exerciseId: secondExercise,
          sets: [{ targetRepsMin: 8, targetRepsMax: 8 }],
        },
      ],
    });
    expect(mocks.tx.workoutExercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: workoutExerciseId },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(mocks.tx.workoutExercise.delete).not.toHaveBeenCalled();
  });

  it("rejects a foreign assigned set ID", async () => {
    await expect(
      updateWorkout(actor, {
        clientId,
        workoutId,
        name: "Bad set",
        scheduledAt: "2026-09-24T09:00",
        exercises: [
          {
            id: workoutExerciseId,
            exerciseId,
            sets: [
              {
                id: "70000000-0000-4000-8000-000000000002",
                targetRepsMin: 8,
                targetRepsMax: 8,
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow("Resource not found");
    expect(mocks.tx.workout.update).not.toHaveBeenCalled();
  });

  it("rejects a workout ID outside the accessible client", async () => {
    mocks.tx.workout.findFirst.mockResolvedValue(null);
    await expect(
      updateWorkout(actor, {
        clientId,
        workoutId,
        name: "Wrong",
        scheduledAt: "2026-09-24T09:00",
        exercises: [
          { exerciseId, sets: [{ targetRepsMin: 8, targetRepsMax: 8 }] },
        ],
      }),
    ).rejects.toThrow("Resource not found");
    expect(mocks.tx.workout.update).not.toHaveBeenCalled();
  });

  it("updates meal fields and ingredients without changing completion data", async () => {
    const updated = await updateMeal(actor, {
      clientId,
      mealId,
      name: "Dinner",
      scheduledAt: "2026-09-24T23:30",
      expectedCalories: "600",
      ingredients: [{ name: "Rice", amount: "150 g" }],
    });
    expect(updated.id).toBe(mealId);
    expect(mocks.tx.mealIngredient.deleteMany).toHaveBeenCalledWith({
      where: { mealId },
    });
    expect(mocks.tx.mealIngredient.createMany).toHaveBeenCalledWith({
      data: [{ mealId, name: "Rice", amount: "150 g", orderIndex: 0 }],
    });
    expect(mocks.tx.mealEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expectedCalories: 600,
          scheduledAt: new Date("2026-09-25T03:30:00.000Z"),
        }),
      }),
    );
  });

  it("updates supplement dosage on the existing row", async () => {
    const updated = await updateSupplement(actor, {
      clientId,
      supplementId,
      name: "Creatine",
      dosageText: "5 g",
      coachNotes: "After lunch",
      scheduledAt: "2026-09-24T12:00",
    });
    expect(updated.id).toBe(supplementId);
    expect(mocks.tx.supplementEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: supplementId },
        data: expect.objectContaining({
          dosageText: "5 g",
          coachNotes: "After lunch",
        }),
      }),
    );
  });

  it("rejects foreign meal and supplement IDs before writing", async () => {
    mocks.tx.mealEvent.findFirst.mockResolvedValue(null);
    mocks.tx.supplementEvent.findFirst.mockResolvedValue(null);
    await expect(
      updateMeal(actor, {
        clientId,
        mealId,
        name: "Wrong",
        scheduledAt: "2026-09-24T12:00",
      }),
    ).rejects.toThrow("Resource not found");
    await expect(
      updateSupplement(actor, {
        clientId,
        supplementId,
        name: "Wrong",
        dosageText: "5 g",
        scheduledAt: "2026-09-24T12:00",
      }),
    ).rejects.toThrow("Resource not found");
    expect(mocks.tx.mealEvent.update).not.toHaveBeenCalled();
    expect(mocks.tx.supplementEvent.update).not.toHaveBeenCalled();
  });

  it("does not grant full edit access to a client actor", async () => {
    const clientActor = {
      ...actor,
      role: "CLIENT" as const,
      coachProfileId: null,
      clientProfileId: clientId,
    };
    await expect(
      updateWorkout(clientActor, {
        clientId,
        workoutId,
        name: "Wrong",
        scheduledAt: "2026-09-24T09:00",
        exercises: [
          { exerciseId, sets: [{ targetRepsMin: 8, targetRepsMax: 8 }] },
        ],
      }),
    ).rejects.toThrow("Resource not found");
    expect(mocks.accessible).not.toHaveBeenCalled();
  });
});
