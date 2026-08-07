import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/current-user";

export default async function AppRouterPage() {
  const actor = await requireActor();
  redirect(
    actor.role === "ADMIN"
      ? "/admin"
      : actor.role === "COACH"
        ? "/coach"
        : "/client",
  );
}
