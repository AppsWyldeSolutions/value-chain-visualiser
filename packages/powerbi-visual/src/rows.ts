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

/**
 * One KPI in one period: what a table row, and a sphere, stand for. Selection
 * ids and tooltip fields are looked up by it.
 */
export const rowKey = (row: KpiRow): string =>
  [row.node, row.group, row.subGroup, row.metric, row.year, row.period].join(
    "\u0000",
  );

/**
 * The roles a KPI needs: without the first five a row cannot be placed on a
 * card for a period, and without the figures there is nothing to draw.
 */
export const REQUIRED: readonly Role[] = [
  "node",
  "group",
  "metric",
  "year",
  "period",
  "actual",
  "budget",
];

/** Each role's name in the field wells, as capabilities.json gives it. */
export const ROLE_NAMES: Record<Role, string> = {
  node: "Node",
  nodeOrder: "Node order",
  group: "Group",
  subGroup: "Sub-group",
  metric: "Metric",
  operator: "Operator",
  valueType: "Value type",
  symbol: "Unit symbol",
  year: "Year",
  period: "Period",
  actual: "Actual",
  budget: "Budget",
};

/** The roles each column of the table is bound to. */
function boundRoles(table: powerbi.DataViewTable | undefined): Set<Role> {
  const bound = new Set<Role>();
  for (const column of table?.columns ?? []) {
    for (const role of ROLES) if (column.roles?.[role]) bound.add(role);
  }
  return bound;
}

/** The required roles with no field yet, in the field wells' order. */
export function missingRoles(table: powerbi.DataViewTable | undefined): Role[] {
  const bound = boundRoles(table);
  return REQUIRED.filter((role) => !bound.has(role));
}

/** "Add Node, Metric, Actual and Budget": what to add before there is a chain. */
export function emptyMessage(missing: readonly Role[]): string {
  const names = missing.map((role) => ROLE_NAMES[role]);
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
      : (names[0] ?? "");
  return `Add ${list}`;
}

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
 * names and column order do not matter. Until every REQUIRED role is bound
 * there are no rows (see missingRoles). Optional fields left unbound read as
 * blank, and blank figures as no data.
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
  if (missingRoles(table).length > 0) return [];

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
