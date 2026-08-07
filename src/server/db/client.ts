import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const { DATABASE_URL } = getServerEnv();
  const adapter = new PrismaNeon({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
