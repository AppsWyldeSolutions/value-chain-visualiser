import type { KpiRow } from "@appswyldesolutions/vcv-web-component";
import type { DataTable, DataValue } from "./tableau.js";

// The worksheet convention (docs/tableau-data-shaping.md): one mark per KPI
// per period, with a field named after each KpiRow field. It is the Power BI
// visual's shaped table (samples/powerbi/shape-kpis.pq), field for field.

/** The fields a worksheet can give, named after the KpiRow fields. */
export const FIELDS = [
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

export type Field = (typeof FIELDS)[number];

/**
 * Which column holds each field, by its summary-data name, as the Configure
 * dialog maps them (#62). A field left out is read by the convention's name.
 */
export type FieldColumns = Partial<Record<Field, string>>;

/** Each field's name in the Configure dialog, as in Power BI's field wells. */
export const FIELD_LABELS: Record<Field, string> = {
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

/**
 * The fields a KPI needs, as in the Power BI visual: without the first five
 * a row cannot be placed on a card for a period, and without the figures
 * there is nothing to draw.
 */
export const REQUIRED: readonly Field[] = [
  "node",
  "group",
  "metric",
  "year",
  "period",
  "actual",
  "budget",
];

/**
 * The field a summary-data column holds: its name exactly, or wrapped in the
 * aggregation Tableau gives it ("SUM(actual)", "ATTR(node)").
 */
export function fieldOf(fieldName: string): Field | undefined {
  const name = /^[A-Z]+\((.+)\)$/.exec(fieldName)?.[1] ?? fieldName;
  return (FIELDS as readonly string[]).includes(name)
    ? (name as Field)
    : undefined;
}

/** The column the convention reads `field` from, among `columns`' names. */
export function matchingColumn(
  field: Field,
  columns: readonly string[],
): string | undefined {
  return columns.find((name) => fieldOf(name) === field);
}

/**
 * Each field's column: a mapped field's by its exact name, and the rest by
 * the convention's names, the first winning if a field has two.
 */
function columnsOf(
  table: DataTable,
  mapped: FieldColumns = {},
): Map<Field, number> {
  const columns = new Map<Field, number>();
  for (const column of table.columns) {
    const field = fieldOf(column.fieldName);
    if (field && !mapped[field] && !columns.has(field)) {
      columns.set(field, column.index);
    }
  }
  for (const [field, name] of Object.entries(mapped) as [Field, string][]) {
    const column = table.columns.find((c) => c.fieldName === name);
    if (column) columns.set(field, column.index);
  }
  return columns;
}

/** The required fields with no column, in the convention's order. */
export function missingFields(
  table: DataTable,
  mapped?: FieldColumns,
): Field[] {
  const columns = columnsOf(table, mapped);
  return REQUIRED.filter((field) => !columns.has(field));
}

/** "metric, actual and budget", with `last` in place of "and". */
const list = (items: readonly string[], last: string) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`
    : (items[0] ?? "");

/**
 * '"KPIs" needs fields named metric and budget.' With a mapping it names the
 * mapped columns that are gone, and points at the Configure dialog.
 */
export function missingMessage(
  worksheet: string,
  missing: readonly Field[],
  mapped?: FieldColumns,
): string {
  if (!mapped) {
    const named = missing.length > 1 ? "fields named" : "a field named";
    return `"${worksheet}" needs ${named} ${list(missing, "and")}.`;
  }
  const fields = missing.map((field) =>
    mapped[field] ? `${field} (mapped to "${mapped[field]}")` : field,
  );
  const them = missing.length > 1 ? "them" : "it";
  return `"${worksheet}" has no field for ${list(fields, "or")}. Use Configure… to map ${them}.`;
}

type Value = DataValue["nativeValue"];

const text = (value: Value): string =>
  value === null || value === undefined ? "" : String(value);

/** Numbers, and text numbers with thousands separators; blank is null. */
const numberOrNull = (value: Value): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = text(value).replace(/,/g, "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

/**
 * Maps a worksheet's summary data to KpiRows, one per mark. Each field comes
 * from the column `mapped` names, or else the column named after it, so
 * column order does not matter and other columns are ignored. Until every
 * REQUIRED field has a column there are no rows (see missingFields).
 * Optional fields left out read as their defaults, and blank figures as no
 * data.
 */
export function rowsFromSummaryData(
  table: DataTable,
  mapped?: FieldColumns,
): KpiRow[] {
  if (missingFields(table, mapped).length > 0) return [];
  const columns = columnsOf(table, mapped);
  return table.data.map((cells) => {
    const get = (field: Field): Value => {
      const index = columns.get(field);
      return index === undefined ? undefined : cells[index]?.nativeValue;
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
