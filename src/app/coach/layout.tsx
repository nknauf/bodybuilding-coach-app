import type { ReactNode } from "react";
import { requireActor } from "@/server/auth/current-user";
import { AppShell } from "@/components/app-shell";

export default async function CoachLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActor(["COACH"]);
  return (
    <AppShell
      role="Coach"
      navigation={[
        { href: "/coach", label: "Clients" },
        { href: "/coach/exercises", label: "Exercises" },
      ]}
    >
      {children}
    </AppShell>
  );
}
