import type { Role, UserStatus } from "@/generated/prisma/client";

type ExistingIdentity = {
  role: Role;
  status: UserStatus;
  deletedAt: Date | null;
};

export function assertEmailAvailableForRole(
  existing: ExistingIdentity | null,
  intendedRole: "COACH" | "CLIENT",
): void {
  if (!existing) return;
  const label = intendedRole === "COACH" ? "coach" : "client";
  if (
    existing.role === intendedRole &&
    !existing.deletedAt &&
    existing.status !== "ARCHIVED"
  ) {
    throw new Error(`A ${label} is already provisioned for this email.`);
  }
  throw new Error(
    "This email is already assigned to another application account.",
  );
}

export function workspacePathForRole(
  role: Role,
): "/admin" | "/coach" | "/client" {
  return role === "ADMIN" ? "/admin" : role === "COACH" ? "/coach" : "/client";
}
