import { redirect } from "next/navigation";
import { WorkspaceAccessState } from "@/components/workspace-access-state";
import { resolveCurrentActor } from "@/server/auth/current-user";
import { workspacePathForRole } from "@/server/auth/provisioning";

export default async function AppRouterPage() {
  const resolution = await resolveCurrentActor();
  if (resolution.kind === "signed_out") redirect("/sign-in");
  if (resolution.kind !== "active") {
    return <WorkspaceAccessState kind={resolution.kind} />;
  }
  redirect(workspacePathForRole(resolution.actor.role));
}
