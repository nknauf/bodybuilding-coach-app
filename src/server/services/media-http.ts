import { ZodError } from "zod";
import {
  AuthenticationError,
  AuthorizationError,
  AccountUnavailableError,
} from "@/server/auth/errors";

export function mediaHttpError(error: unknown) {
  if (error instanceof AuthenticationError)
    return Response.json({ error: "Sign in required." }, { status: 401 });
  if (
    error instanceof AuthorizationError ||
    error instanceof AccountUnavailableError
  )
    return Response.json({ error: "Resource not found." }, { status: 404 });
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  if (
    error instanceof Error &&
    [
      "Unsupported media type.",
      "File is too large.",
      "Upload authorization expired. Select the file again.",
      "Uploaded file did not match the selected file.",
    ].includes(error.message)
  ) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("media_request_failed", error);
  return Response.json(
    {
      error:
        error instanceof Error && error.message.startsWith("Media ")
          ? error.message
          : "Media operation failed. Try again.",
    },
    { status: 500 },
  );
}

export function checkMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new AuthorizationError();
}
