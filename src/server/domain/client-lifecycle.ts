import type { ClientStatus, UserStatus } from "@/generated/prisma/client";

export function userStatusForClientStatus(status: ClientStatus): UserStatus {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "INACTIVE") return "DISABLED";
  if (status === "ARCHIVED") return "ARCHIVED";
  return "INVITED";
}
