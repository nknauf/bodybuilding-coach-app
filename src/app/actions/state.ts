import { ZodError } from "zod";
import { AuthorizationError } from "@/server/auth/errors";

export interface ActionState {
  ok: boolean;
  message: string;
  inviteUrl?: string;
  createdExercise?: {
    id: string;
    name: string;
    scope: "COACH";
  };
}

export const initialActionState: ActionState = { ok: false, message: "" };

export function actionError(error: unknown): ActionState {
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: error.issues[0]?.message ?? "Check the submitted values.",
    };
  }
  if (error instanceof AuthorizationError) {
    return { ok: false, message: "Resource not found." };
  }
  if (error instanceof Error && error.message.length < 180) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "The change could not be saved." };
}
