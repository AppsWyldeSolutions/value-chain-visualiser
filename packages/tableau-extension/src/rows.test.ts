// @vitest-environment jsdom
// (Importing the web component defines an HTMLElement subclass.)
import type { KpiRow } from "@appswyldesolutions/vcv-web-component";
import { describe, expect, it } from "vitest";
import {
  fieldOf,
  missingFields,
  missingMessage,
  REQUIRED,
  rowsFromSummaryData,
} from "./rows.js";
import { fixtureRows, summaryTable } from "./testTable.js";

// The API's long rows, as the web component reads them: what the extension
// must reproduce from a worksheet shaped to the convention.
const ROWS = fixtureRows();

describe("rowsFromSummaryData", () => {
  it("reproduces the long-row fixture from a shaped worksheet", () => {
    expect(ROWS).toHaveLength(1020);
    expect(rowsFromSummaryData(summaryTable(ROWS))).toEqual(ROWS);
  });

  it("finds each field by its name, whatever the column order", () => {
    const shuffled: (keyof KpiRow)[] = [
      "budget",
      "metric",
      "period",
      "valueType",
      "actual",
      "node",
      "operator",
      "year",
      "symbol",
      "subGroup",
      "nodeOrder",
      "group",
    ];
    expect(rowsFromSummaryData(summaryTable(ROWS, shuffled))).toEqual(ROWS);
  });

  it("reads the fields whatever Tableau aggregates them with", () => {
    const table = summaryTable(ROWS, undefined, {
      node: "ATTR(node)",
      nodeOrder: "MIN(nodeOrder)",
      year: "AGG(year)",
      actual: "AVG(actual)",
      budget: "budget",
    });
    expect(rowsFromSummaryData(table)).toEqual(ROWS);
  });

  it("ignores the worksheet's other fields", () => {
    const table = summaryTable(ROWS.slice(0, 1));
    table.columns.push({ fieldName: "Measure Names", index: 12 });
    table.data[0]!.push({
      value: "x",
      nativeValue: "x",
      formattedValue: "x",
    });
    expect(rowsFromSummaryData(table)).toEqual(ROWS.slice(0, 1));
  });

  it("keeps value type apart from the unit symbol", () => {
    // A "%" KPI counted as a number, not a percentage, in the source data.
    const corner = rowsFromSummaryData(summaryTable(ROWS)).find((row) =>
      row.metric.startsWith("90% of Corner Stones"),
    );
    expect(corner).toMatchObject({ symbol: "%", valueType: "Number" });
  });

  it("reads Tableau's nulls and text numbers", () => {
    const table = summaryTable(ROWS.slice(0, 1));
    const cells = table.data[0]!;
    const set = (fieldName: string, nativeValue: unknown) => {
      const index = table.columns.findIndex((c) => c.fieldName === fieldName);
      cells[index] = { value: nativeValue, nativeValue, formattedValue: "" };
    };
    set("year", "2026");
    set("nodeOrder", "3");
    set("SUM(actual)", null);
    set("SUM(budget)", "604,000");
    set("subGroup", null);
    expect(rowsFromSummaryData(table)[0]).toMatchObject({
      year: 2026,
      nodeOrder: 3,
      actual: null,
      budget: 604000,
      subGroup: "",
    });
  });

  it("reads a worksheet with no marks as no rows", () => {
    expect(rowsFromSummaryData(summaryTable([]))).toEqual([]);
  });

  it("gives no rows until the fields that place a KPI are there", () => {
    const partial = summaryTable(ROWS, ["metric", "actual", "budget"]);
    expect(rowsFromSummaryData(partial)).toEqual([]);
  });

  it("needs the figures too: no actual or budget, no rows", () => {
    const noFigures = summaryTable(ROWS.slice(0, 1), [
      "node",
      "group",
      "metric",
      "year",
      "period",
    ]);
    expect(rowsFromSummaryData(noFigures)).toEqual([]);
  });

  it("reads the optional fields left out as their defaults", () => {
    const [row] = rowsFromSummaryData(
      summaryTable(ROWS.slice(0, 1), [...REQUIRED]),
    );
    expect(row).toMatchObject({
      node: ROWS[0]!.node,
      operator: "Equal",
      symbol: "",
      valueType: "Number",
      nodeOrder: 0,
      subGroup: "",
    });
  });
});

describe("fieldOf", () => {
  it("matches a field's exact name, alone or in an aggregation", () => {
    expect(fieldOf("actual")).toBe("actual");
    expect(fieldOf("SUM(actual)")).toBe("actual");
    expect(fieldOf("COUNTD(node)")).toBe("node");
    expect(fieldOf("ATTR(subGroup)")).toBe("subGroup");
  });

  it("matches nothing else", () => {
    expect(fieldOf("Actual")).toBeUndefined();
    expect(fieldOf("sub Group")).toBeUndefined();
    expect(fieldOf("SUM(Actual)")).toBeUndefined();
    expect(fieldOf("sum(actual)")).toBeUndefined();
    expect(fieldOf("link")).toBeUndefined();
    expect(fieldOf("Measure Values")).toBeUndefined();
  });
});

describe("missingFields", () => {
  it("names the required fields with no column, in the convention's order", () => {
    const table = summaryTable(ROWS.slice(0, 1), ["group", "year", "period"]);
    expect(missingFields(table)).toEqual([
      "node",
      "metric",
      "actual",
      "budget",
    ]);
  });

  it("names none when every required field has a column", () => {
    expect(missingFields(summaryTable(ROWS.slice(0, 1)))).toEqual([]);
    expect(
      missingFields(summaryTable(ROWS.slice(0, 1), [...REQUIRED])),
    ).toEqual([]);
  });

  it("names them all for a worksheet with none of them", () => {
    expect(missingFields({ columns: [], data: [] })).toEqual([...REQUIRED]);
  });
});

describe("missingMessage", () => {
  it("asks for the missing fields by the names the worksheet needs", () => {
    expect(missingMessage("KPIs", ["node", "metric", "actual", "budget"])).toBe(
      '"KPIs" needs fields named node, metric, actual and budget.',
    );
    expect(missingMessage("KPIs", ["year", "period"])).toBe(
      '"KPIs" needs fields named year and period.',
    );
    expect(missingMessage("KPIs", ["budget"])).toBe(
      '"KPIs" needs a field named budget.',
    );
  });
});
