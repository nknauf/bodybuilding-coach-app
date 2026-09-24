import { requireActor } from "@/server/auth/current-user";
import { removeMedia } from "@/server/services/media";
import {
  checkMutationOrigin,
  mediaHttpError,
} from "@/server/services/media-http";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    checkMutationOrigin(request);
    const actor = await requireActor(["CLIENT", "COACH"]);
    await removeMedia(actor, (await params).mediaId);
    return Response.json({ ok: true });
  } catch (error) {
    return mediaHttpError(error);
  }
}
