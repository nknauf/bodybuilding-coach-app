import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  linkClerkUser,
  parseLinkClerkUserArgs,
} from "../src/server/admin/link-clerk-user";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const input = parseLinkClerkUserArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to link a Clerk user.");

  const database = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
  });
  try {
    const result = await linkClerkUser(database, input);
    console.log(
      result.outcome === "linked"
        ? `Clerk identity linked to ${input.email}.`
        : `Clerk identity was already linked to ${input.email}.`,
    );
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
