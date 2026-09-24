import { requireActor } from "@/server/auth/current-user";
import { listClientMedia } from "@/server/services/media";
import { mediaHttpError } from "@/server/services/media-http";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(["CLIENT", "COACH"]);
    const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
    const day = new URL(request.url).searchParams.get("date") ?? undefined;
    return Response.json(await listClientMedia(actor, clientId, day));
  } catch (error) {
    return mediaHttpError(error);
  }
}
