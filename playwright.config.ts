import { defineConfig, devices } from "@playwright/test";
import { resolveE2ETarget } from "./scripts/lib/e2e-target.mjs";

const { baseURL } = resolveE2ETarget();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  // The demo uses fictional in-browser state; never persist browser evidence by default.
  outputDir:
    process.env.E2E_SYNTHETIC_ARTIFACTS === "1"
      ? "test-results"
      : "/tmp/more-sore-e2e-results",
  use: {
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
