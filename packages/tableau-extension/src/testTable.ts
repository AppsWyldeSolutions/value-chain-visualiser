import { readFileSync } from "node:fs";
import path from "node:path";
import {
  rowsFromJson,
  type KpiRow,
} from "@appswyldesolutions/vcv-web-component";
import type { DataTable } from "./tableau.js";

/** The fixture's long rows, as the API returns them. */
export function fixtureRecords(): Record<string, unknown>[] {
  // __dirname, not import.meta.url: under jsdom that URL is not a file: one.
  return (
    JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../fixtures/bobos-big-block.json"),
        "utf8",
      ),
    ) as { records: Record<string, unknown>[] }
  ).records;
}

/**
 * The fixture's KpiRows, as the web component reads the API's long rows:
 * what the extension must reproduce from a shaped worksheet.
 */
export function fixtureRows(): KpiRow[] {
  return rowsFromJson(fixtureRecords());
}

/**
 * The names a shaped worksheet's summary data gives its columns: the field
 * names, with the two measures summed, as Tableau aggregates them by default.
 */
export const WORKSHEET_NAMES: Record<keyof KpiRow, string> = {
  node: "node",
  nodeOrder: "nodeOrder",
  group: "group",
  subGroup: "subGroup",
  metric: "metric",
  operator: "operator",
  valueType: "valueType",
  symbol: "symbol",
  year: "year",
  period: "period",
  actual: "SUM(actual)",
  budget: "SUM(budget)",
};

/**
 * `rows` as Tableau's summary data would hold them: one column per field,
 * in the order `fields` gives, named as `names` says (WORKSHEET_NAMES by
 * default), with Tableau's empty cells as null native values.
 */
export function summaryTable(
  rows: KpiRow[],
  fields: readonly (keyof KpiRow)[] = Object.keys(
    WORKSHEET_NAMES,
  ) as (keyof KpiRow)[],
  names: Partial<Record<keyof KpiRow, string>> = {},
): DataTable {
  return {
    columns: fields.map((field, index) => ({
      fieldName: names[field] ?? WORKSHEET_NAMES[field],
      index,
    })),
    data: rows.map((row) =>
      fields.map((field) => {
        const value = row[field];
        const nativeValue = value === "" ? null : value;
        return {
          value: nativeValue ?? "%null%",
          nativeValue,
          formattedValue: String(nativeValue ?? "Null"),
        };
      }),
    ),
  };
}
