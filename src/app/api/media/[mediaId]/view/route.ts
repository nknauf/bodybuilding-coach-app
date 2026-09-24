import { requireActor } from "@/server/auth/current-user";
import { getMediaViewUrl } from "@/server/services/media";
import { mediaHttpError } from "@/server/services/media-http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const actor = await requireActor(["CLIENT", "COACH"]);
    return Response.json(await getMediaViewUrl(actor, (await params).mediaId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return mediaHttpError(error);
  }
}
