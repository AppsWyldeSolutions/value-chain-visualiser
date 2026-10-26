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

/** What else the fake dashboard has, beyond one worksheet named "KPIs". */
export interface FakeOptions {
  /** environment.mode: "viewing" unless an author is editing. */
  mode?: "authoring" | "viewing";
  /** The extension's saved settings. */
  settings?: Record<string, string>;
}

/**
 * A stand-in for window.tableau, as a script. `window.vcvTableau` lets the
 * test change the worksheet's data and raise SummaryDataChanged, and records
 * the settings saved and the dialogs opened and closed.
 */
export function fakeLibrary(table: Table, options: FakeOptions = {}): string {
  return `(() => {
  const listeners = [];
  const control = (window.vcvTableau = {
    table: ${JSON.stringify(table)},
    settings: ${JSON.stringify(options.settings ?? {})},
    reads: 0,
    saves: 0,
    dialogs: [],
    closed: [],
    change(table) {
      control.table = table;
      listeners.forEach((listener) => listener({ type: "summary-data-changed" }));
    },
  });
  window.tableau = {
    TableauEventType: {
      FilterChanged: "filter-changed",
      SummaryDataChanged: "summary-data-changed",
      SettingsChanged: "settings-changed",
    },
    extensions: {
      initializeAsync: async () => {},
      initializeDialogAsync: async () => "",
      environment: { mode: ${JSON.stringify(options.mode ?? "viewing")} },
      settings: {
        get: (key) => control.settings[key],
        set: (key, value) => {
          control.settings[key] = value;
        },
        saveAsync: async () => {
          control.saves++;
          return control.settings;
        },
        addEventListener: () => () => true,
      },
      ui: {
        // Records the dialog; Tableau would open it in its own window.
        displayDialogAsync: (url, payload, options) => {
          control.dialogs.push({ url, options });
          return new Promise(() => {});
        },
        closeDialog: (payload) => control.closed.push(payload),
      },
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

/** Opens `file` (the extension, or its Configure dialog) with the fake. */
export async function open(
  page: Page,
  table = tableOf(lines),
  options: FakeOptions = {},
  file = "index.html",
) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(LIBRARY, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: fakeLibrary(table, options),
    }),
  );
  // Relative, so it opens the page under whatever baseURL the project serves.
  await page.goto(file);
  return errors;
}

/** What the fake recorded: settings, saves, dialogs opened and closed. */
export const recorded = (page: Page) =>
  page.evaluate(() => {
    const { settings, saves, dialogs, closed } = (
      window as unknown as {
        vcvTableau: {
          settings: Record<string, string>;
          saves: number;
          dialogs: { url: string; options: unknown }[];
          closed: string[];
        };
      }
    ).vcvTableau;
    return { settings, saves, dialogs, closed };
  });

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
