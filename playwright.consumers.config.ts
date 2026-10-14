import { defineConfig, devices } from "@playwright/test";
import {
  EXPRESS_PORT,
  EXPRESS_URL,
  NEXT_PORT,
  NEXT_URL,
} from "./apps/consumers/e2e/urls.js";

// The consumer smoke tests: apps/consumers/* installed from the packed
// tarballs. Run through `npm run e2e:consumers`, which packs, installs and
// builds them first (scripts/consumers.mjs).
export default defineConfig({
  testDir: "apps/consumers/e2e",
  forbidOnly: !!process.env.CI,
  reporter: "list",
  expect: { timeout: 15_000 },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: "node server.js",
      cwd: "apps/consumers/express",
      env: { PORT: String(EXPRESS_PORT) },
      url: EXPRESS_URL,
      reuseExistingServer: false,
    },
    {
      command: `npx next start -p ${NEXT_PORT}`,
      cwd: "apps/consumers/next",
      url: NEXT_URL,
      reuseExistingServer: false,
    },
  ],
});
