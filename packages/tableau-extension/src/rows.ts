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

type Field = (typeof FIELDS)[number];

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

/** Each field's column; the first wins if a field has two. */
function columnsOf(table: DataTable): Map<Field, number> {
  const columns = new Map<Field, number>();
  for (const column of table.columns) {
    const field = fieldOf(column.fieldName);
    if (field && !columns.has(field)) columns.set(field, column.index);
  }
  return columns;
}

/** The required fields with no column, in the convention's order. */
export function missingFields(table: DataTable): Field[] {
  const columns = columnsOf(table);
  return REQUIRED.filter((field) => !columns.has(field));
}

/** '"KPIs" needs fields named metric and budget.' */
export function missingMessage(
  worksheet: string,
  missing: readonly Field[],
): string {
  const list =
    missing.length > 1
      ? `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`
      : (missing[0] ?? "");
  const named = missing.length > 1 ? "fields named" : "a field named";
  return `"${worksheet}" needs ${named} ${list}.`;
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
 * from the column named after it, so column order does not matter and other
 * columns are ignored. Until every REQUIRED field has a column there are no
 * rows (see missingFields). Optional fields left out read as their defaults,
 * and blank figures as no data.
 */
export function rowsFromSummaryData(table: DataTable): KpiRow[] {
  if (missingFields(table).length > 0) return [];
  const columns = columnsOf(table);
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
