import { num } from "./format.js";
import type { KpiRow } from "./types.js";

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
] as const;
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function nodeOrderOf(node: string, seen: Map<string, number>): number {
  const existing = seen.get(node);
  if (existing !== undefined) return existing;
  const order = seen.size;
  seen.set(node, order);
  return order;
}

function toNullableNumber(v: unknown): number | null {
  const n = num(v);
  return isNaN(n) ? null : n;
}

interface WideRecord {
  l: string;
  g: string;
  s: string;
  m: string;
  t: string;
  u: string;
  o: string;
  y: string;
  a: string[];
  b: string[];
}

// The prototype's month-per-column format (docs/prototype/Main.dc.html's DATA array).
export function fromWideRecords(json: unknown): KpiRow[] {
  if (!Array.isArray(json)) {
    throw new Error("fromWideRecords: expected an array of records");
  }
  const records = json as WideRecord[];
  const nodeOrders = new Map<string, number>();
  const rows: KpiRow[] = [];
  for (const r of records) {
    const nodeOrder = nodeOrderOf(r.l, nodeOrders);
    for (let i = 0; i < 12; i++) {
      rows.push({
        node: r.l,
        nodeOrder,
        group: r.g as KpiRow["group"],
        subGroup: r.s,
        metric: r.m,
        operator: r.o as KpiRow["operator"],
        valueType: r.t,
        symbol: r.u,
        year: Number(r.y),
        period: MONTH_LABELS[i]!,
        actual: toNullableNumber(r.a[i]),
        budget: toNullableNumber(r.b[i]),
      });
    }
  }
  return rows;
}

interface LongRow {
  link: string;
  group: string;
  subGroup: string;
  metric: string;
  kpiOperator: string;
  metricValueType: string;
  kpiSymbol: string;
  year: string;
  [monthField: string]: unknown;
}

// The Power BI / API format: one row per metric, with a field per month for
// actual and a "<month>Budget" field per month for budget.
export function fromLongRows(rows: unknown[]): KpiRow[] {
  if (!Array.isArray(rows)) {
    throw new Error("fromLongRows: expected an array of rows");
  }
  const records = rows as LongRow[];
  const nodeOrders = new Map<string, number>();
  const out: KpiRow[] = [];
  for (const r of records) {
    const nodeOrder = nodeOrderOf(r.link, nodeOrders);
    for (let i = 0; i < 12; i++) {
      const month = MONTHS[i]!;
      out.push({
        node: r.link,
        nodeOrder,
        group: r.group as KpiRow["group"],
        subGroup: r.subGroup,
        metric: r.metric,
        operator: r.kpiOperator as KpiRow["operator"],
        valueType: r.metricValueType,
        symbol: r.kpiSymbol,
        year: Number(r.year),
        period: MONTH_LABELS[i]!,
        actual: toNullableNumber(r[month]),
        budget: toNullableNumber(r[`${month}Budget`]),
      });
    }
  }
  return out;
}
