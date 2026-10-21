/** @param {Readonly<Record<string, string | undefined>>} [env] */
export function resolveE2ETarget(env = process.env) {
  const target = env.E2E_BASE_URL;
  if (!target) {
    throw new Error(
      "E2E_BASE_URL must identify an explicitly approved isolated staging deployment.",
    );
  }
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new Error("E2E_BASE_URL must be a valid approved origin.");
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "E2E_BASE_URL must be an origin without credentials, path, query, or hash.",
    );
  }

  if (
    env.E2E_ALLOW_REMOTE !== "1" ||
    env.E2E_APPROVED_HOST !== url.hostname ||
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Remote E2E targets require E2E_ALLOW_REMOTE=1, an exact E2E_APPROVED_HOST hostname match, and HTTPS.",
    );
  }
  return { baseURL: url.origin };
}
