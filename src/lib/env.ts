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
  R2_ACCOUNT_ID: optionalSecret(),
  R2_ACCESS_KEY_ID: optionalSecret(),
  R2_SECRET_ACCESS_KEY: optionalSecret(),
  R2_BUCKET_NAME: optionalSecret(),
  R2_PUBLIC_URL: optionalUrl,
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

export function getR2Env() {
  const env = getServerEnv();
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    throw new Error("R2 configuration is incomplete");
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET_NAME,
  };
}
