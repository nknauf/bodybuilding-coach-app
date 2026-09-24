import { requireActor } from "@/server/auth/current-user";
import { finalizeMediaUpload } from "@/server/services/media";
import {
  checkMutationOrigin,
  mediaHttpError,
} from "@/server/services/media-http";

export async function POST(request: Request) {
  try {
    checkMutationOrigin(request);
    const actor = await requireActor(["CLIENT", "COACH"]);
    const body = await request.json();
    const media = await finalizeMediaUpload(actor, body.ticket);
    return Response.json({ id: media.id });
  } catch (error) {
    return mediaHttpError(error);
  }
}
