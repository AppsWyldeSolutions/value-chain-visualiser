// @vitest-environment jsdom
// (Importing the web component defines an HTMLElement subclass.)
import type { KpiRow } from "@appswyldesolutions/vcv-web-component";
import { describe, expect, it } from "vitest";
import {
  matchingColumn,
  missingFields,
  missingMessage,
  rowsFromSummaryData,
} from "./rows.js";
import { fixtureRows, summaryTable } from "./testTable.js";

// The v2 field mapping (#62): a worksheet whose fields have the author's own
// names, mapped to the visual's fields in the Configure dialog.
const ROWS = fixtureRows();

/** The author's own field names: nothing like the convention's. */
const NAMES: Record<keyof KpiRow, string> = {
  node: "Process",
  nodeOrder: "Process Order",
  group: "KPI Group",
  subGroup: "KPI Sub-group",
  metric: "KPI Name",
  operator: "Rule",
  valueType: "Value Kind",
  symbol: "Unit",
  year: "YEAR(Period Date)",
  period: "Month",
  actual: "SUM(Actual $)",
  budget: "SUM(Budget $)",
};
const FULL = NAMES as Partial<Record<keyof KpiRow, string>>;

describe("rowsFromSummaryData with a mapping", () => {
  it("reads each field from the column it is mapped to", () => {
    const table = summaryTable(ROWS, undefined, NAMES);
    expect(rowsFromSummaryData(table)).toEqual([]);
    expect(rowsFromSummaryData(table, FULL)).toEqual(ROWS);
  });

  it("reads fields left unmapped by the convention's names", () => {
    const table = summaryTable(ROWS, undefined, {
      node: "Process",
      metric: "KPI Name",
    });
    expect(
      rowsFromSummaryData(table, { node: "Process", metric: "KPI Name" }),
    ).toEqual(ROWS);
  });

  it("matches a mapped column by its name exactly, aggregation and all", () => {
    const table = summaryTable(ROWS.slice(0, 12), undefined, NAMES);
    expect(rowsFromSummaryData(table, { ...FULL, actual: "Actual $" })).toEqual(
      [],
    );
    expect(missingFields(table, { ...FULL, actual: "Actual $" })).toEqual([
      "actual",
    ]);
  });

  it("does not fall back to the convention for a field mapped to a column that is gone", () => {
    // The worksheet has a "metric" column, but metric is mapped elsewhere.
    const table = summaryTable(ROWS.slice(0, 12));
    expect(missingFields(table, { metric: "KPI Name" })).toEqual(["metric"]);
  });
});

describe("missingMessage with a mapping", () => {
  it("says which mapped fields are gone, and how to fix it", () => {
    expect(
      missingMessage("KPIs", ["metric", "budget"], {
        metric: "KPI Name",
      }),
    ).toBe(
      '"KPIs" has no field for metric (mapped to "KPI Name") or budget. Use Configure… to map them.',
    );
    expect(
      missingMessage("KPIs", ["actual"], { actual: "SUM(Actual $)" }),
    ).toBe(
      '"KPIs" has no field for actual (mapped to "SUM(Actual $)"). Use Configure… to map it.',
    );
  });
});

describe("matchingColumn", () => {
  const columns = ["Process", "SUM(actual)", "metric", "Year"];

  it("finds the column the convention would read a field from", () => {
    expect(matchingColumn("actual", columns)).toBe("SUM(actual)");
    expect(matchingColumn("metric", columns)).toBe("metric");
  });

  it("finds nothing when no column has the field's name", () => {
    expect(matchingColumn("node", columns)).toBeUndefined();
    expect(matchingColumn("year", columns)).toBeUndefined();
  });
});
