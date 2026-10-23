import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// The extension's page from its dev server, as Tableau Desktop loads it
// through the .trex. Short of Tableau itself (see the package README),
// Tableau's library is swapped for a fake whose dashboard has one worksheet:
// the shaped sample table (samples/powerbi/shaped-table.tsv, the fixture
// one row per KPI per period), as its summary data.
const LIBRARY = "**/lib/tableau.extensions.1.latest.js";

type Cell = { value: unknown; nativeValue: unknown; formattedValue: string };
type Table = {
  columns: { fieldName: string; index: number }[];
  data: Cell[][];
};

const [header, ...lines] = readFileSync(
  path.resolve("samples/powerbi/shaped-table.tsv"),
  "utf8",
)
  .trim()
  .split(/\r?\n/)
  .map((line) => line.split("\t"));
const NUMBERS = new Set(["nodeOrder", "year", "actual", "budget"]);
// Tableau sums the two measures by default, and names them so.
const fieldName = (name: string) =>
  name === "actual" || name === "budget" ? `SUM(${name})` : name;

/** Shaped-table lines as summary data, with only the fields in `keep`. */
function tableOf(
  rows: string[][],
  keep: (name: string) => boolean = () => true,
): Table {
  const indexes = header!.flatMap((name, i) => (keep(name) ? [i] : []));
  return {
    columns: indexes.map((i, index) => ({
      fieldName: fieldName(header![i]!),
      index,
    })),
    data: rows.map((row) =>
      indexes.map((i) => {
        const text = row[i] ?? "";
        const nativeValue =
          text === "" ? null : NUMBERS.has(header![i]!) ? Number(text) : text;
        return {
          value: nativeValue ?? "%null%",
          nativeValue,
          formattedValue: text,
        };
      }),
    ),
  };
}

/**
 * A stand-in for window.tableau, as a script. `window.vcvTableau` lets the
 * test change the worksheet's data and raise SummaryDataChanged.
 */
function fakeLibrary(table: Table): string {
  return `(() => {
  const listeners = [];
  const control = (window.vcvTableau = {
    table: ${JSON.stringify(table)},
    reads: 0,
    change(table) {
      control.table = table;
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
                return control.table;
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

async function open(page: Page, table = tableOf(lines)) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(LIBRARY, (route) =>
    route.fulfill({ contentType: "text/javascript", body: fakeLibrary(table) }),
  );
  await page.goto("/index.html");
  return errors;
}

const change = (page: Page, table: Table) =>
  page.evaluate(
    (table) =>
      (
        window as unknown as { vcvTableau: { change(t: unknown): void } }
      ).vcvTableau.change(table),
    table,
  );

const visual = (page: Page) => page.locator("value-chain-visualiser");

const rowCount = (page: Page) =>
  visual(page).evaluate(
    (element: HTMLElementTagNameMap["value-chain-visualiser"]) =>
      element.rows?.length,
  );

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
