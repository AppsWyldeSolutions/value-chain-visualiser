"use strict";

import type { KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";

/**
 * The data roles in capabilities.json: one per KpiRow field, named after it.
 */
export const ROLES = [
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
] as const satisfies readonly (keyof KpiRow)[];

type Role = (typeof ROLES)[number];

/** Without these a row cannot be placed on a card for a period. */
const REQUIRED: readonly Role[] = ["node", "group", "metric", "year", "period"];

type Value = powerbi.PrimitiveValue | undefined;

const text = (value: Value): string =>
  value === null || value === undefined ? "" : String(value);

const numberOrNull = (value: Value): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Maps Power BI's table data view to KpiRows, one per table row. Each field
 * comes from the column bound to its data role, so the report's own field
 * names and column order do not matter. Until node, group, metric, year and
 * period are all bound there are no rows. Optional fields left unbound read
 * as blank, and blank figures as no data.
 */
export function rowsFromTable(
  table: powerbi.DataViewTable | undefined,
): KpiRow[] {
  if (!table) return [];
  const columnOf = new Map<Role, number>();
  table.columns.forEach((column, index) => {
    for (const role of ROLES) {
      if (column.roles?.[role] && !columnOf.has(role)) {
        columnOf.set(role, index);
      }
    }
  });
  if (REQUIRED.some((role) => !columnOf.has(role))) return [];

  return (table.rows ?? []).map((values) => {
    const get = (role: Role): Value => {
      const index = columnOf.get(role);
      return index === undefined ? undefined : values[index];
    };
    return {
      node: text(get("node")),
      nodeOrder: numberOrNull(get("nodeOrder")) ?? 0,
      group: text(get("group")) as KpiRow["group"],
      subGroup: text(get("subGroup")),
      metric: text(get("metric")),
      operator: text(get("operator")) === "LessThan" ? "LessThan" : "Equal",
      valueType: text(get("valueType")) || "Number",
      symbol: text(get("symbol")),
      year: numberOrNull(get("year")) ?? 0,
      period: text(get("period")),
      actual: numberOrNull(get("actual")),
      budget: numberOrNull(get("budget")),
    };
  });
}
