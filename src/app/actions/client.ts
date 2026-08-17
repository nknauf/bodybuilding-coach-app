"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth/current-user";
import {
  completeMeal,
  completeSupplement,
  finalizeWorkout,
  logAssignedSet,
  logBodyweight,
  logExtraSet,
  removeExtraSet,
  rescheduleEvent,
  saveWorkoutNotes,
} from "@/server/services/client";
import type { ActionState } from "./state";
import { actionError } from "./state";

export async function logSetAction(
  workoutId: string,
  assignedSetId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["CLIENT"]);
    await logAssignedSet(actor, {
      workoutId,
      assignedSetId,
      ...Object.fromEntries(formData),
    });
    revalidatePath(`/client/workouts/${workoutId}`);
    revalidatePath("/client");
    return { ok: true, message: "Set saved." };
  } catch (error) {
    return actionError(error);
  }
}

export async function fastLogSetAction(
  workoutId: string,
  assignedSetId: string,
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(["CLIENT"]);
  await logAssignedSet(actor, {
    workoutId,
    assignedSetId,
    ...Object.fromEntries(formData),
  });
  revalidatePath(`/client/workouts/${workoutId}`);
  revalidatePath("/client");
}

export async function logExtraSetAction(
  workoutId: string,
  workoutExerciseId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["CLIENT"]);
    await logExtraSet(actor, {
      workoutId,
      workoutExerciseId,
      actualReps: Number(formData.get("actualReps")),
      actualWeight: formData.get("actualWeight")
        ? Number(formData.get("actualWeight"))
        : undefined,
      weightUnit: formData.get("weightUnit") || undefined,
    });
    revalidatePath(`/client/workouts/${workoutId}`);
    return { ok: true, message: "Extra set added." };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeExtraSetAction(
  workoutId: string,
  setLogId: string,
): Promise<void> {
  const actor = await requireActor(["CLIENT"]);
  await removeExtraSet(actor, setLogId);
  revalidatePath(`/client/workouts/${workoutId}`);
}

export async function finalizeWorkoutAction(workoutId: string): Promise<void> {
  const actor = await requireActor(["CLIENT"]);
  await finalizeWorkout(actor, workoutId);
  revalidatePath(`/client/workouts/${workoutId}`);
  revalidatePath("/client");
}

export async function completeMealAction(mealId: string): Promise<void> {
  const actor = await requireActor(["CLIENT"]);
  await completeMeal(actor, { mealId });
  revalidatePath("/client");
}

export async function completeMealWithActualsAction(
  mealId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["CLIENT"]);
    await completeMeal(actor, { mealId, ...Object.fromEntries(formData) });
    revalidatePath("/client");
    return { ok: true, message: "Meal completed." };
  } catch (error) {
    return actionError(error);
  }
}

export async function completeSupplementAction(
  supplementId: string,
): Promise<void> {
  const actor = await requireActor(["CLIENT"]);
  await completeSupplement(actor, supplementId);
  revalidatePath("/client");
}

export async function logBodyweightAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["CLIENT"]);
    await logBodyweight(actor, Object.fromEntries(formData));
    revalidatePath("/client");
    return { ok: true, message: "Bodyweight logged." };
  } catch (error) {
    return actionError(error);
  }
}

export async function rescheduleEventAction(
  kind: "WORKOUT" | "MEAL" | "SUPPLEMENT",
  eventId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["CLIENT"]);
    await rescheduleEvent(actor, {
      kind,
      eventId,
      scheduledAt: formData.get("scheduledAt"),
    });
    revalidatePath("/client");
    return { ok: true, message: "Event moved. It cannot be moved again." };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveWorkoutNotesAction(
  workoutId: string,
  exerciseId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["CLIENT"]);
    await saveWorkoutNotes(actor, {
      workoutId,
      exerciseId: exerciseId || undefined,
      workoutNotes: formData.get("workoutNotes") || undefined,
      exerciseNotes: formData.get("exerciseNotes") || undefined,
    });
    revalidatePath(`/client/workouts/${workoutId}`);
    return { ok: true, message: "Notes saved." };
  } catch (error) {
    return actionError(error);
  }
}
