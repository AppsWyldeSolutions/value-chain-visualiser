import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { HOSTED_URL } from "../src/manifest";
import { lines, open, rowCount, visual } from "./fakeTableau";

// The built site (dist/, from npm run build) served from the path GitHub
// Pages serves it from, /value-chain-visualiser/tableau/: what a dashboard
// loads through the hosted .trex. Tableau's library is the fake again, as
// outside Tableau the real one does not start.
test.beforeAll(() => {
  expect(
    existsSync(path.resolve("packages/tableau-extension/dist/index.html")),
    "build the extension first: npm run build",
  ).toBe(true);
});

test("draws from the built site, under its Pages path", async ({ page }) => {
  const errors = await open(page);
  expect(new URL(page.url()).pathname).toBe(
    "/value-chain-visualiser/tableau/index.html",
  );
  await expect(visual(page).locator("svg").first()).toBeVisible();
  expect(await rowCount(page)).toBe(lines.length);
  expect(errors).toEqual([]);
});

test("serves Tableau's library beside the page", async ({ request }) => {
  const library = await request.get("lib/tableau.extensions.1.latest.js");
  expect(library.ok()).toBe(true);
  expect(await library.text()).toContain("initializeAsync");
});

test("serves the .trex, pointing at GitHub Pages", async ({ request }) => {
  const trex = await request.get("value-chain-visualiser.trex");
  expect(trex.ok()).toBe(true);
  expect(await trex.text()).toContain(`<url>${HOSTED_URL}</url>`);
});
