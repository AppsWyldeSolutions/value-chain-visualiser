// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it } from "vitest";
import { periodNotice } from "./periods";
import { testHost } from "./testHost";
import { tableOf } from "./testTable";
import { Visual } from "./visual";

const ROWS = fromLongRows(
  (
    JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../fixtures/bobos-big-block.json"),
        "utf8",
      ),
    ) as { records: unknown[] }
  ).records,
);
const AUGUST = ROWS.filter((row) => row.period === "August");

afterEach(() => {
  document.body.replaceChildren();
});

describe("periodNotice", () => {
  it("names the period shown and counts every period, empty actuals too", () => {
    // The fixture: 12 months of 2026, actuals up to August.
    expect(periodNotice(ROWS)).toBe(
      "Showing August 2026, the latest with actuals of 12 periods in the data. Use the Year and Period slicers to pick one.",
    );
  });

  it("says nothing for a single period", () => {
    expect(periodNotice(AUGUST)).toBeNull();
    expect(periodNotice([])).toBeNull();
  });

  it("counts a year and period as one period, across years", () => {
    const lastYear = AUGUST.map((row) => ({ ...row, year: 2025 }));
    expect(periodNotice([...AUGUST, ...lastYear])).toBe(
      "Showing August 2026, the latest with actuals of 2 periods in the data. Use the Year and Period slicers to pick one.",
    );
  });

  it("does not claim actuals when no period has any", () => {
    const blank = (row: KpiRow): KpiRow => ({ ...row, actual: null });
    const rows = ROWS.filter((row) => ["March", "April"].includes(row.period));
    expect(periodNotice(rows.map(blank))).toBe(
      "Showing January 2026 of 2 periods in the data. Use the Year and Period slicers to pick one.",
    );
  });
});

describe("the notice in the visual", () => {
  function construct() {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const visual = new Visual({
      element,
      host: testHost().host,
    } as powerbi.extensibility.visual.VisualConstructorOptions);
    const update = (rows: KpiRow[]) =>
      visual.update({
        dataViews: [{ table: tableOf(rows), metadata: { columns: [] } }],
      } as unknown as powerbi.extensibility.visual.VisualUpdateOptions);
    return { element, update };
  }
  const notice = (element: Element) =>
    element.querySelector(".vcv-notice")?.textContent ?? null;

  it("shows the latest period with actuals, and says so", () => {
    const { element, update } = construct();
    update(ROWS);
    expect(element.querySelector(".vcv-header__subtitle")?.textContent).toBe(
      "August 2026 · 53 KPIs measured against budget",
    );
    expect(notice(element)).toBe(periodNotice(ROWS));
  });

  it("clears it once the slicers narrow the rows to one period, in place", () => {
    const { element, update } = construct();
    update(ROWS);
    const root = element.querySelector(".vcv-root");
    update(AUGUST);
    expect(notice(element)).toBeNull();
    expect(element.querySelector(".vcv-root")).toBe(root);
  });
});
