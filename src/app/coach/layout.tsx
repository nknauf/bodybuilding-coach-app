import type { ReactNode } from "react";
import { requirePageActor } from "@/server/auth/current-user";
import { AppShell } from "@/components/app-shell";

export default async function CoachLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePageActor(["COACH"]);
  return (
    <AppShell
      role="Coach"
      navigation={[
        { href: "/coach", label: "Overview" },
        { href: "/coach#clients", label: "Clients" },
        { href: "/coach#schedule", label: "Schedule" },
        { href: "/coach/exercises", label: "Exercises" },
        { href: "/coach#compliance", label: "Compliance" },
      ]}
    >
      {children}
    </AppShell>
  );
}
