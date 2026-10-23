// @vitest-environment jsdom
// (Importing the web component defines an HTMLElement subclass.)
import { rowsFromJson } from "@appswyldesolutions/vcv-web-component";
import { describe, expect, it } from "vitest";
import { LONG_ROW_FIELDS, missingFields, rowsFromSummaryData } from "./rows.js";
import { fixtureRecords, summaryTable } from "./testTable.js";

const records = fixtureRecords();

describe("rowsFromSummaryData", () => {
  it("reads the same KpiRows from the worksheet as from the API's long rows", () => {
    expect(rowsFromSummaryData(summaryTable(records))).toEqual(
      rowsFromJson(records),
    );
  });

  it("matches Tableau's field names to long-row fields loosely", () => {
    const names = LONG_ROW_FIELDS.map((field) =>
      field === "subGroup"
        ? "Sub Group"
        : field === "kpiOperator"
          ? "kpi_operator"
          : field === "januaryBudget"
            ? "SUM(January Budget)"
            : field,
    );
    const rows = rowsFromSummaryData(summaryTable(records.slice(0, 1), names));
    expect(rows[0]).toMatchObject({
      subGroup: records[0]!.subGroup,
      operator: records[0]!.kpiOperator,
      period: "January",
      budget: Number(records[0]!.januaryBudget),
    });
  });

  it("reads Tableau's nulls as months with no value", () => {
    const rows = rowsFromSummaryData(summaryTable(records.slice(0, 1)));
    // The fixture's first record has no actual from September.
    expect(rows.find((row) => row.period === "September")?.actual).toBeNull();
  });

  it("reads a worksheet with no marks as no rows", () => {
    expect(rowsFromSummaryData(summaryTable([]))).toEqual([]);
  });
});

describe("missingFields", () => {
  it("is empty when every long-row field has a column", () => {
    expect(missingFields(summaryTable(records))).toEqual([]);
  });

  it("names the long-row fields with no column", () => {
    const table = summaryTable(records);
    table.columns = table.columns.filter(
      (column) => !["kpiSymbol", "decemberBudget"].includes(column.fieldName),
    );
    expect(missingFields(table)).toEqual(["kpiSymbol", "decemberBudget"]);
  });
});
