"use strict";

import type { KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";

/** The KpiRow fields, as the column names the stub mapping looks for. */
export const FIELDS: readonly (keyof KpiRow)[] = [
  "node",
  "nodeOrder",
  "group",
  "subGroup",
  "metric",
  "operator",
  "valueType",
  "symbol",
  "year",
  "period",
  "actual",
  "budget",
];

const text = (value: powerbi.PrimitiveValue | undefined): string =>
  value === null || value === undefined ? "" : String(value);

const numberOrNull = (
  value: powerbi.PrimitiveValue | undefined,
): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Stub mapping: reads the table data view as KpiRows, one per table row,
 * taking each field from the column of the same name (any case). Fields
 * with no column are blank, and blank figures are read as no data. The real
 * mapping from a report's own columns replaces this.
 */
export function rowsFromTable(
  table: powerbi.DataViewTable | undefined,
): KpiRow[] {
  if (!table || table.columns.length === 0) return [];
  const column = new Map<string, number>();
  table.columns.forEach((col, index) => {
    column.set(col.displayName.toLowerCase(), index);
  });
  return (table.rows ?? []).map((values) => {
    const get = (field: keyof KpiRow) => {
      const index = column.get(field.toLowerCase());
      return index === undefined ? undefined : values[index];
    };
    return {
      node: text(get("node")),
      nodeOrder: numberOrNull(get("nodeOrder")) ?? 0,
      group: text(get("group")) as KpiRow["group"],
      subGroup: text(get("subGroup")),
      metric: text(get("metric")),
      operator: text(get("operator")) === "LessThan" ? "LessThan" : "Equal",
      valueType: text(get("valueType")),
      symbol: text(get("symbol")),
      year: numberOrNull(get("year")) ?? 0,
      period: text(get("period")),
      actual: numberOrNull(get("actual")),
      budget: numberOrNull(get("budget")),
    };
  });
}
