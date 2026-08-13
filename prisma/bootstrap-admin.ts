import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  bootstrapAdmin,
  parseBootstrapAdminArgs,
} from "../src/server/admin/bootstrap-admin";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const input = parseBootstrapAdminArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to bootstrap an admin.");

  const database = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
  });

  try {
    const result = await bootstrapAdmin(database, input);
    console.log(
      result.outcome === "created"
        ? `Administrator ${result.user.email} created with INVITED status.`
        : `Administrator ${result.user.email} already exists; no changes made.`,
    );
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
