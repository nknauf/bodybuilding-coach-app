import { requireActor } from "@/server/auth/current-user";
import { initiateMediaUpload } from "@/server/services/media";
import {
  checkMutationOrigin,
  mediaHttpError,
} from "@/server/services/media-http";

export async function POST(request: Request) {
  try {
    checkMutationOrigin(request);
    const actor = await requireActor(["CLIENT", "COACH"]);
    return Response.json(
      await initiateMediaUpload(actor, await request.json()),
    );
  } catch (error) {
    return mediaHttpError(error);
  }
}
