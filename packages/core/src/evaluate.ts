import { one, two, unitFor } from "./format.js";
import type { Evaluation, FormattedValues, KpiRow } from "./types.js";

// Equal: actual >= budget is on target. LessThan: actual <= budget is on target.
// Sphere fill = clamp(actual / budget, 0, 1); budget is a full sphere.
export function evaluate(row: KpiRow): Evaluation {
  const hasData = row.actual !== null && row.budget !== null;
  if (!hasData) {
    return { met: false, level: 0, label: "No data", hasData: false };
  }
  const a = row.actual as number;
  const b = row.budget as number;
  const met = row.operator === "LessThan" ? a <= b : a >= b;
  const level = b > 0 ? Math.max(0, Math.min(1, a / b)) : met || a > 0 ? 1 : 0;
  const label =
    b > 0 ? Math.round((a / b) * 100) + "%" : met ? "On target" : "Off target";
  return { met, level, label, hasData: true };
}

export function formatValues(row: KpiRow): FormattedValues {
  if (row.actual === null || row.budget === null) {
    return { actual: "", budget: "", pair: "" };
  }
  const a = row.actual;
  const b = row.budget;
  const u = unitFor(row.metric, row.symbol, a, b);
  return { actual: one(a, u), budget: one(b, u), pair: two(a, b, u) };
}
