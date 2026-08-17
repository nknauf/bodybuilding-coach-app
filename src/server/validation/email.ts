import { z } from "zod";

/** Normalize only application-significant casing and surrounding whitespace.
 * Provider-specific alias syntax (including `+tag`) is intentionally preserved.
 */
export const normalizedEmailSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.email());
