import { defineConfig, devices } from "@playwright/test";

const port = 5173;
const baseURL = `http://localhost:${port}`;
const tableauURL = "http://localhost:8765";
// The trailing slash makes specs' relative paths resolve under it.
const tableauHostedURL =
  "http://localhost:4174/value-chain-visualiser/tableau/";

export default defineConfig({
  testDir: "apps/playground/e2e",
  globalSetup: "./apps/playground/e2e/global-setup.ts",
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
    {
      // The packaged Power BI visual (packages/powerbi-visual/.tmp/drop),
      // built by npm run build.
      name: "powerbi-visual",
      testDir: "test/e2e",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      // The Tableau extension's page, from its dev server.
      name: "tableau-extension",
      testDir: "packages/tableau-extension/e2e",
      testMatch: "extension.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: tableauURL,
      },
    },
    {
      // The built extension (packages/tableau-extension/dist, from npm run
      // build), served from its GitHub Pages path.
      name: "tableau-hosted",
      testDir: "packages/tableau-extension/e2e",
      testMatch: "hosted.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: tableauHostedURL,
      },
    },
  ],
  webServer: [
    {
      command: `npm run dev -w apps/playground -- --port ${port} --strictPort`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
    },
    {
      // The port the .trex in packages/tableau-extension points at.
      command: "npm start -w packages/tableau-extension",
      url: tableauURL,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Ready when the port opens, built or not: hosted.spec.ts says when
      // dist/ is missing.
      command: "npm run preview -w packages/tableau-extension",
      port: 4174,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
