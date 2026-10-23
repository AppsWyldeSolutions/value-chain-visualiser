import {
  rowsFromJson,
  type KpiRow,
} from "@appswyldesolutions/vcv-web-component";
import type { DataTable } from "./tableau.js";

// A sample mapping, enough to prove the pipeline end to end: the worksheet's
// fields are expected to be named after the API's long-row fields (link,
// group, subGroup, ..., january, januaryBudget, ...). Shaping arbitrary
// worksheets into rows is a separate issue (#59).

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** The long-row fields read from the worksheet, in the API's spelling. */
export const LONG_ROW_FIELDS = [
  "link",
  "group",
  "subGroup",
  "metric",
  "kpiOperator",
  "metricValueType",
  "kpiSymbol",
  "year",
  ...MONTHS,
  ...MONTHS.map((month) => `${month}Budget`),
];

/**
 * Compares field names loosely, so "Sub Group", "SUM(January Budget)" and
 * "kpi_operator" match subGroup, januaryBudget and kpiOperator.
 */
function key(fieldName: string): string {
  const inner = /^[A-Za-z]+\((.*)\)$/.exec(fieldName.trim())?.[1] ?? fieldName;
  return inner.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The long-row fields the table has no column for. */
export function missingFields(table: DataTable): string[] {
  const keys = new Set(table.columns.map((column) => key(column.fieldName)));
  return LONG_ROW_FIELDS.filter((field) => !keys.has(key(field)));
}

/**
 * The worksheet's summary data as `KpiRow`s, one long row per table row.
 * Fields the table lacks are left out (empty months, blank names).
 */
export function rowsFromSummaryData(table: DataTable): KpiRow[] {
  const indexOf = new Map(
    table.columns.map((column) => [key(column.fieldName), column.index]),
  );
  const longRows = table.data.map((cells) => {
    const row: Record<string, unknown> = {};
    for (const field of LONG_ROW_FIELDS) {
      const index = indexOf.get(key(field));
      const value = index === undefined ? null : cells[index]?.nativeValue;
      row[field] = value ?? "";
    }
    return row;
  });
  return rowsFromJson(longRows);
}
