import { defineConfig, devices } from "@playwright/test";

const port = 5173;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "apps/playground/e2e",
  fullyParallel: true,
  // The blurred glass is costly to rasterise; more workers than this and
  // screenshots start timing out on a busy machine.
  workers: 4,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  // Full-page screenshots of the tall, blurred layouts are slow to capture
  // twice (Playwright compares two in a row) when every worker is busy.
  expect: { timeout: 15_000 },
  use: { baseURL },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: `npm run dev -w apps/playground -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
