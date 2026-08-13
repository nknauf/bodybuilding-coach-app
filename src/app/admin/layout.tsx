import type { ReactNode } from "react";
import { requireActor } from "@/server/auth/current-user";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActor(["ADMIN"]);
  return (
    <AppShell
      role="Admin"
      navigation={[
        { href: "/admin", label: "Overview" },
        { href: "/admin#coaches", label: "Coaches" },
        { href: "/admin/clients", label: "Clients" },
        { href: "/admin/audit", label: "Audit log" },
      ]}
    >
      {children}
    </AppShell>
  );
}
