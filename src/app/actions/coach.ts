"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth/current-user";
import {
  createCoachExercise,
  provisionClient,
  retryClientInvitation,
  scheduleMeal,
  scheduleSupplement,
  scheduleWorkout,
  setClientStatus,
  updateMeal,
  updateSupplement,
  updateWorkout,
} from "@/server/services/coach";
import type { ActionState } from "./state";
import { actionError } from "./state";

export async function provisionClientAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    const result = await provisionClient(actor, Object.fromEntries(formData));
    revalidatePath("/coach");
    return {
      ok: true,
      message:
        result.deliveryMethod === "CLERK_EMAIL"
          ? "Invitation email requested. You can also copy the link."
          : "Client provisioned. Copy and send the manual invitation link.",
      inviteUrl: result.inviteUrl,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function retryClientInvitationAction(
  inviteId: string,
  _state: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _state;
  void _formData;
  try {
    const actor = await requireActor(["COACH"]);
    const result = await retryClientInvitation(actor, inviteId);
    revalidatePath("/coach");
    return {
      ok: true,
      message:
        result.deliveryMethod === "CLERK_EMAIL"
          ? "Invitation email requested again."
          : "Manual invitation regenerated.",
      inviteUrl: result.inviteUrl,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function setClientStatusAction(
  clientId: string,
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED",
): Promise<void> {
  const actor = await requireActor(["COACH"]);
  await setClientStatus(actor, clientId, status);
  revalidatePath("/coach");
  revalidatePath(`/coach/clients/${clientId}`);
}

export async function createExerciseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    const exercise = await createCoachExercise(
      actor,
      Object.fromEntries(formData),
    );
    revalidatePath("/coach/exercises");
    return {
      ok: true,
      message: "Exercise added to your catalog.",
      createdExercise: {
        id: exercise.id,
        name: exercise.name,
        scope: "COACH",
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        category: exercise.category,
      },
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "An exercise with this name already exists in your catalog.",
      };
    }
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
    const payload = JSON.parse(
      String(formData.get("payload") ?? "{}"),
    ) as unknown;
    await scheduleWorkout(actor, { ...(payload as object), clientId });
    revalidatePath(`/coach/clients/${clientId}`);
    revalidatePath("/coach/schedule");
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
    const payload = JSON.parse(
      String(formData.get("payload") ?? "{}"),
    ) as unknown;
    await scheduleMeal(actor, { ...(payload as object), clientId });
    revalidatePath(`/coach/clients/${clientId}`);
    revalidatePath("/coach/schedule");
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

export async function updateWorkoutAction(
  clientId: string,
  workoutId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    const payload = JSON.parse(
      String(formData.get("payload") ?? "{}"),
    ) as object;
    await updateWorkout(actor, { ...payload, clientId, workoutId });
    revalidatePath(`/coach/clients/${clientId}`);
    revalidatePath("/coach");
    revalidatePath("/client");
    revalidatePath(`/client/workouts/${workoutId}`);
    return { ok: true, message: "Workout updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateMealAction(
  clientId: string,
  mealId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    const payload = JSON.parse(
      String(formData.get("payload") ?? "{}"),
    ) as object;
    await updateMeal(actor, { ...payload, clientId, mealId });
    revalidatePath(`/coach/clients/${clientId}`);
    revalidatePath("/coach");
    revalidatePath("/client");
    return { ok: true, message: "Meal updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateSupplementAction(
  clientId: string,
  supplementId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["COACH"]);
    await updateSupplement(actor, {
      ...Object.fromEntries(formData),
      clientId,
      supplementId,
    });
    revalidatePath(`/coach/clients/${clientId}`);
    revalidatePath("/coach");
    revalidatePath("/client");
    return { ok: true, message: "Supplement updated." };
  } catch (error) {
    return actionError(error);
  }
}
