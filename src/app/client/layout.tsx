import type { ReactNode } from "react";
import { requireActor } from "@/server/auth/current-user";
import { AppShell } from "@/components/app-shell";

export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActor(["CLIENT"]);
  return (
    <AppShell
      role="Client"
      navigation={[{ href: "/client", label: "My week" }]}
    >
      {children}
    </AppShell>
  );
}
