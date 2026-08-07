"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth/current-user";
import {
  createCoachExercise,
  provisionClient,
  scheduleMeal,
  scheduleSupplement,
  scheduleWorkout,
} from "@/server/services/coach";
import type { ActionState } from "./state";
import { actionError } from "./state";

export async function provisionClientAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    await provisionClient(actor, Object.fromEntries(formData));
    revalidatePath("/coach");
    return {
      ok: true,
      message: "Client provisioned. Ask them to sign up with the same email.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function createExerciseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    await createCoachExercise(actor, Object.fromEntries(formData));
    revalidatePath("/coach/exercises");
    return { ok: true, message: "Exercise added to your catalog." };
  } catch (error) {
    return actionError(error);
  }
}

export async function scheduleWorkoutAction(
  clientId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    const reps = String(formData.get("expectedReps") ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
    await scheduleWorkout(actor, {
      clientId,
      name: formData.get("name"),
      notes: formData.get("notes") || undefined,
      durationMinutes: formData.get("durationMinutes"),
      scheduledAt: formData.get("scheduledAt"),
      exercises: [
        {
          exerciseId: formData.get("exerciseId"),
          expectedReps: reps,
        },
      ],
    });
    revalidatePath(`/coach/clients/${clientId}`);
    return { ok: true, message: "Workout scheduled." };
  } catch (error) {
    return actionError(error);
  }
}

export async function scheduleMealAction(
  clientId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    await scheduleMeal(actor, {
      ...Object.fromEntries(formData),
      clientId,
    });
    revalidatePath(`/coach/clients/${clientId}`);
    return { ok: true, message: "Meal scheduled." };
  } catch (error) {
    return actionError(error);
  }
}

export async function scheduleSupplementAction(
  clientId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    await scheduleSupplement(actor, {
      ...Object.fromEntries(formData),
      clientId,
    });
    revalidatePath(`/coach/clients/${clientId}`);
    return { ok: true, message: "Supplement scheduled." };
  } catch (error) {
    return actionError(error);
  }
}
