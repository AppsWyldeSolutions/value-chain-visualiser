import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// The extension's page from its dev server, as Tableau Desktop loads it
// through the .trex. Short of Tableau itself (see the package README),
// Tableau's library is swapped for a fake whose dashboard has one worksheet
// with the fixture's long rows as its summary data.
const LIBRARY = "**/lib/tableau.extensions.1.latest.js";

const records = (
  JSON.parse(
    readFileSync(path.resolve("fixtures/bobos-big-block.json"), "utf8"),
  ) as { records: Record<string, unknown>[] }
).records;
// One column per fixture field, ids and all: the extension ignores fields it
// does not read.
const FIELDS = Object.keys(records[0]!);

/**
 * A stand-in for window.tableau, as a script. `window.vcvTableau` lets the
 * test change the worksheet's data and raise SummaryDataChanged.
 */
function fakeLibrary(): string {
  return `(() => {
  const fields = ${JSON.stringify(FIELDS)};
  const table = (records) => ({
    columns: fields.map((fieldName, index) => ({ fieldName, index })),
    data: records.map((record) =>
      fields.map((field) => {
        const v = record[field] === "" ? null : record[field];
        return { value: v ?? "%null%", nativeValue: v, formattedValue: String(v) };
      }),
    ),
  });
  const listeners = [];
  const control = (window.vcvTableau = {
    records: ${JSON.stringify(records)},
    reads: 0,
    change(records) {
      control.records = records;
      listeners.forEach((listener) => listener({ type: "summary-data-changed" }));
    },
  });
  window.tableau = {
    TableauEventType: {
      FilterChanged: "filter-changed",
      SummaryDataChanged: "summary-data-changed",
    },
    extensions: {
      initializeAsync: async () => {},
      dashboardContent: {
        dashboard: {
          worksheets: [
            {
              name: "KPIs",
              getSummaryDataAsync: async () => {
                control.reads++;
                return table(control.records);
              },
              addEventListener: (type, listener) => {
                if (type === "summary-data-changed") listeners.push(listener);
                return () => true;
              },
            },
          ],
        },
      },
    },
  };
})();`;
}

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(LIBRARY, (route) =>
    route.fulfill({ contentType: "text/javascript", body: fakeLibrary() }),
  );
  await page.goto("/index.html");
  return errors;
}

const visual = (page: Page) => page.locator("value-chain-visualiser");

test("draws the worksheet's data with compact cards", async ({ page }) => {
  const errors = await open(page);
  await expect(visual(page).locator("svg").first()).toBeVisible();
  expect(
    await visual(page).evaluate(
      (element: HTMLElementTagNameMap["value-chain-visualiser"]) => ({
        rows: element.rows?.length,
        cardDisplay: element.cardDisplay,
      }),
    ),
  ).toEqual({ rows: records.length * 12, cardDisplay: "compact" });
  await expect(page.locator("#status")).toBeHidden();
  expect(errors).toEqual([]);
});

test("redraws when the worksheet's summary data changes", async ({ page }) => {
  const errors = await open(page);
  await expect(visual(page).locator("svg").first()).toBeVisible();
  const first = records[0]!.link as string;
  const rest = records.filter((record) => record.link !== first);
  await page.evaluate(
    (rest) =>
      (
        window as unknown as { vcvTableau: { change(r: unknown[]): void } }
      ).vcvTableau.change(rest),
    rest,
  );
  await expect
    .poll(() =>
      visual(page).evaluate(
        (element: HTMLElementTagNameMap["value-chain-visualiser"]) =>
          element.rows?.length,
      ),
    )
    .toBe(rest.length * 12);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { vcvTableau: { reads: number } }).vcvTableau
          .reads,
    ),
  ).toBe(2);
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
