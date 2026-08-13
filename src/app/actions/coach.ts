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
