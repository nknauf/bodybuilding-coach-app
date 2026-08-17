import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
const optionalSecret = (minimum = 1) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minimum).optional(),
  );

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  CLERK_SECRET_KEY: optionalSecret(),
  CLERK_WEBHOOK_SIGNING_SECRET: optionalSecret(),
  CLERK_WEBHOOK_SECRET: optionalSecret(),
  APP_URL: optionalUrl,
  CRON_SECRET: optionalSecret(16),
});

export function getServerEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid server environment: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }
  return result.data;
}
