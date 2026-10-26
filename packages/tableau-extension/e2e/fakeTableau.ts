import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

// What the extension's Playwright specs share: a stand-in for Tableau's
// library whose dashboard has one worksheet, the shaped sample table
// (samples/powerbi/shaped-table.tsv, the fixture one row per KPI per period),
// as its summary data, and helpers to open the page with it.
export const LIBRARY = "**/lib/tableau.extensions.1.latest.js";

type Cell = { value: unknown; nativeValue: unknown; formattedValue: string };
export type Table = {
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
export function tableOf(
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
export function fakeLibrary(table: Table): string {
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

export async function open(page: Page, table = tableOf(lines)) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(LIBRARY, (route) =>
    route.fulfill({ contentType: "text/javascript", body: fakeLibrary(table) }),
  );
  // Relative, so it opens the page under whatever baseURL the project serves.
  await page.goto("index.html");
  return errors;
}

export const change = (page: Page, table: Table) =>
  page.evaluate(
    (table) =>
      (
        window as unknown as { vcvTableau: { change(t: unknown): void } }
      ).vcvTableau.change(table),
    table,
  );

export const visual = (page: Page) => page.locator("value-chain-visualiser");

export const rowCount = (page: Page) =>
  visual(page).evaluate(
    (element: HTMLElementTagNameMap["value-chain-visualiser"]) =>
      element.rows?.length,
  );

/** The shaped table's data lines, one per KPI per period. */
export { lines };
