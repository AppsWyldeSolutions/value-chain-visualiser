import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type KpiRow } from "@appswyldesolutions/vcv-core";
import { describe, expect, it } from "vitest";
import { rowsFromTable } from "./rows";
import { tableOf } from "./testTable";

// The API's long rows, as core reads them: what the visual must reproduce
// from Power BI's table data view.
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

describe("rowsFromTable", () => {
  it("reproduces the long-row fixture from its table data view", () => {
    expect(ROWS).toHaveLength(1020);
    expect(rowsFromTable(tableOf(ROWS))).toEqual(ROWS);
  });

  it("finds each field by its data role, whatever the column order or name", () => {
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
    expect(rowsFromTable(tableOf(ROWS, shuffled))).toEqual(ROWS);
  });

  it("keeps value type apart from the unit symbol", () => {
    // A "%" KPI counted as a number, not a percentage, in the source data.
    const corner = rowsFromTable(tableOf(ROWS)).find((row) =>
      row.metric.startsWith("90% of Corner Stones"),
    );
    expect(corner).toMatchObject({ symbol: "%", valueType: "Number" });
  });

  it("reads Power BI's blanks and text numbers", () => {
    const table = tableOf(ROWS.slice(0, 1));
    const row = table.rows[0]!;
    const at = (role: string) =>
      table.columns.findIndex((column) => column.roles?.[role]);
    row[at("year")] = "2026";
    row[at("nodeOrder")] = "3";
    row[at("actual")] = null;
    row[at("budget")] = "";
    row[at("subGroup")] = null;
    expect(rowsFromTable(table)[0]).toMatchObject({
      year: 2026,
      nodeOrder: 3,
      actual: null,
      budget: null,
      subGroup: "",
    });
  });

  it("gives no rows without a table, or without rows", () => {
    expect(rowsFromTable(undefined)).toEqual([]);
    expect(rowsFromTable({ columns: [], rows: [] })).toEqual([]);
    expect(rowsFromTable(tableOf([]))).toEqual([]);
  });

  it("gives no rows until the fields that place a KPI are bound", () => {
    const partial = tableOf(ROWS, ["metric", "actual", "budget"]);
    expect(rowsFromTable(partial)).toEqual([]);
  });

  it("reads a KPI with no figures bound as having no data", () => {
    const required: (keyof KpiRow)[] = [
      "node",
      "group",
      "metric",
      "year",
      "period",
    ];
    const [row] = rowsFromTable(tableOf(ROWS.slice(0, 1), required));
    expect(row).toMatchObject({
      node: ROWS[0]!.node,
      actual: null,
      budget: null,
      operator: "Equal",
      symbol: "",
      valueType: "Number",
      nodeOrder: 0,
    });
  });
});
