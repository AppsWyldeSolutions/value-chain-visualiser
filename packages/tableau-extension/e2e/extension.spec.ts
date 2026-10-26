import { expect, test } from "@playwright/test";
import { change, lines, open, rowCount, tableOf, visual } from "./fakeTableau";

// The extension's page from its dev server, as Tableau Desktop loads it
// through the .trex. Short of Tableau itself (see the package README),
// Tableau's library is swapped for a fake (fakeTableau.ts).

test("draws the shaped worksheet with compact cards", async ({ page }) => {
  const errors = await open(page);
  await expect(visual(page).locator("svg").first()).toBeVisible();
  expect(await rowCount(page)).toBe(lines.length);
  expect(
    await visual(page).evaluate(
      (element: HTMLElementTagNameMap["value-chain-visualiser"]) =>
        element.cardDisplay,
    ),
  ).toBe("compact");
  await expect(page.locator("#status")).toBeHidden();
  expect(errors).toEqual([]);
});

test("redraws when the worksheet's summary data changes", async ({ page }) => {
  const errors = await open(page);
  await expect(visual(page).locator("svg").first()).toBeVisible();
  const first = lines[0]![0];
  const rest = lines.filter((line) => line[0] !== first);
  await change(page, tableOf(rest));
  await expect.poll(() => rowCount(page)).toBe(rest.length);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { vcvTableau: { reads: number } }).vcvTableau
          .reads,
    ),
  ).toBe(2);
  expect(errors).toEqual([]);
});

test("names the fields a worksheet lacks instead of drawing", async ({
  page,
}) => {
  const errors = await open(
    page,
    tableOf(lines, (name) => name !== "metric" && name !== "budget"),
  );
  await expect(page.locator("#status")).toHaveText(
    '"KPIs" needs fields named metric and budget.',
  );
  await expect(visual(page)).toBeHidden();
  // Adding them draws the chain.
  await change(page, tableOf(lines));
  await expect(page.locator("#status")).toBeHidden();
  await expect(visual(page).locator("svg").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("loads Tableau's own library, which only starts inside Tableau", async ({
  page,
}) => {
  const library = page.waitForResponse(
    (response) =>
      response.url().endsWith("/lib/tableau.extensions.1.latest.js") &&
      response.ok(),
  );
  await page.goto("/index.html");
  await library;
  expect(await page.evaluate(() => typeof window.tableau?.extensions)).toBe(
    "object",
  );
  // Outside Tableau, initializeAsync fails, and the page says so.
  await expect(page.locator("#status")).toContainText(
    "Could not start the extension",
  );
});
