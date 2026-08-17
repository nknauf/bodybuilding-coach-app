import type { ReactNode } from "react";
import { requirePageActor } from "@/server/auth/current-user";
import { AppShell } from "@/components/app-shell";

export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePageActor(["CLIENT"]);
  return (
    <AppShell
      role="Client"
      navigation={[
        { href: "/client", label: "Today" },
        { href: "/client#calendar", label: "Calendar" },
        { href: "/client#progress", label: "Progress" },
        { href: "/client#bodyweight", label: "Bodyweight" },
      ]}
    >
      {children}
    </AppShell>
  );
}
