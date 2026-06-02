import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the Next.js dev server. Start it separately with
// `pnpm dev` in apps/web before running `pnpm test:e2e`.
// In CI, the webServer block spins it up automatically.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // In CI spin up the Next.js server automatically. Locally, start it yourself.
  ...(process.env.CI
    ? {
        webServer: {
          command: "pnpm start",
          url: BASE_URL,
          timeout: 120_000,
          reuseExistingServer: false,
        },
      }
    : {}),
});
