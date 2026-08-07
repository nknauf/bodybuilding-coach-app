"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth/current-user";
import { createCoach, setCoachEnabled } from "@/server/services/admin";
import type { ActionState } from "./state";
import { actionError } from "./state";

export async function createCoachAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(["ADMIN"]);
    await createCoach(actor, Object.fromEntries(formData));
    revalidatePath("/admin");
    return {
      ok: true,
      message: "Coach provisioned. They can now sign up with this email.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function setCoachEnabledAction(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const actor = await requireActor(["ADMIN"]);
  await setCoachEnabled(actor, userId, enabled);
  revalidatePath("/admin");
}
