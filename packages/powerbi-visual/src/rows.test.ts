import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import { describe, expect, it } from "vitest";
import { rowsFromTable } from "./rows";
import { tableOf } from "./testTable";

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

describe("rowsFromTable (stub mapping)", () => {
  it("reads one KpiRow per table row, by column name", () => {
    expect(rowsFromTable(tableOf(ROWS))).toEqual(ROWS);
  });

  it("matches column names whatever their case or column order", () => {
    const table = tableOf(ROWS.slice(0, 3), ["metric", "year", "node"]);
    for (const column of table.columns) {
      column.displayName = column.displayName.toUpperCase();
    }
    expect(rowsFromTable(table).map((row) => row.metric)).toEqual(
      ROWS.slice(0, 3).map((row) => row.metric),
    );
  });

  it("gives no rows without a table", () => {
    expect(rowsFromTable(undefined)).toEqual([]);
    expect(rowsFromTable({ columns: [], rows: [] })).toEqual([]);
  });

  it("reads missing or blank figures as no data", () => {
    const table = tableOf(ROWS.slice(0, 1), ["node", "metric", "year"]);
    const [row] = rowsFromTable(table);
    expect(row?.actual).toBeNull();
    expect(row?.budget).toBeNull();
  });
});
