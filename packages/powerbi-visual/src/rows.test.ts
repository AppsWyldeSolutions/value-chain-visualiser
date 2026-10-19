import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type KpiRow } from "@appswyldesolutions/vcv-core";
import { describe, expect, it } from "vitest";
import {
  emptyMessage,
  missingRoles,
  REQUIRED,
  ROLE_NAMES,
  rowsFromTable,
} from "./rows";
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

  it("needs the figures too: no Actual or Budget, no rows", () => {
    const noFigures = tableOf(ROWS.slice(0, 1), [
      "node",
      "group",
      "metric",
      "year",
      "period",
    ]);
    expect(rowsFromTable(noFigures)).toEqual([]);
  });

  it("reads the optional fields left unbound as their defaults", () => {
    const [row] = rowsFromTable(tableOf(ROWS.slice(0, 1), [...REQUIRED]));
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

describe("missingRoles", () => {
  it("names the required roles with no field, in the field wells' order", () => {
    const table = tableOf(ROWS.slice(0, 1), ["group", "year", "period"]);
    expect(missingRoles(table)).toEqual(["node", "metric", "actual", "budget"]);
  });

  it("names none when every required role has a field", () => {
    expect(missingRoles(tableOf(ROWS.slice(0, 1)))).toEqual([]);
    expect(missingRoles(tableOf(ROWS.slice(0, 1), [...REQUIRED]))).toEqual([]);
  });

  it("names them all without a table", () => {
    expect(missingRoles(undefined)).toEqual([...REQUIRED]);
  });
});

describe("emptyMessage", () => {
  it("asks for the missing fields by their field well names", () => {
    expect(emptyMessage(["node", "metric", "actual", "budget"])).toBe(
      "Add Node, Metric, Actual and Budget",
    );
    expect(emptyMessage(["year", "period"])).toBe("Add Year and Period");
    expect(emptyMessage(["budget"])).toBe("Add Budget");
  });

  it("uses the names capabilities.json gives the roles", () => {
    const capabilities = JSON.parse(
      readFileSync(path.resolve(__dirname, "../capabilities.json"), "utf8"),
    ) as { dataRoles: { name: string; displayName: string }[] };
    for (const [role, name] of Object.entries(ROLE_NAMES)) {
      expect(
        capabilities.dataRoles.find((r) => r.name === role)?.displayName,
        role,
      ).toBe(name);
    }
  });
});
