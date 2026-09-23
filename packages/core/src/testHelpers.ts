import type { KpiRow } from "./types.js";

export function makeRow(overrides: Partial<KpiRow>): KpiRow {
  return {
    node: "Test Node",
    nodeOrder: 0,
    group: "Primary",
    subGroup: "",
    metric: "Test metric",
    operator: "Equal",
    valueType: "Number",
    symbol: "",
    year: 2026,
    period: "August",
    actual: null,
    budget: null,
    ...overrides,
  };
}
