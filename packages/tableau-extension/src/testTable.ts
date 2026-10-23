import { readFileSync } from "node:fs";
import path from "node:path";
import { LONG_ROW_FIELDS } from "./rows.js";
import type { DataTable } from "./tableau.js";

// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
/** The fixture's long rows, as the API returns them. */
export function fixtureRecords(): Record<string, unknown>[] {
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
 * Long rows as Tableau's summary data would have them: one column per
 * field, named `fieldNames[i]` (the long-row names by default), and
 * Tableau's empty cells as null native values.
 */
export function summaryTable(
  records: Record<string, unknown>[],
  fieldNames: string[] = LONG_ROW_FIELDS,
): DataTable {
  return {
    columns: fieldNames.map((fieldName, index) => ({ fieldName, index })),
    data: records.map((record) =>
      LONG_ROW_FIELDS.map((field) => {
        const value = record[field];
        const nativeValue = value === "" || value === undefined ? null : value;
        return {
          value: nativeValue ?? "%null%",
          nativeValue,
          formattedValue: String(nativeValue ?? "Null"),
        };
      }),
    ),
  };
}
