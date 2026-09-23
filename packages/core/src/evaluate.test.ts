import { describe, expect, it } from "vitest";
import { evaluate, formatValues } from "./evaluate.js";
import { makeRow } from "./testHelpers.js";

// One test per row of docs/specs/core.md's rule table.
describe("evaluate", () => {
  it('Equal, short: not met, level ~0.44, label "44%"', () => {
    const row = makeRow({ operator: "Equal", actual: 13808, budget: 31468 });
    const result = evaluate(row);
    expect(result.hasData).toBe(true);
    expect(result.met).toBe(false);
    expect(result.level).toBeCloseTo(0.4388, 3);
    expect(result.label).toBe("44%");
  });

  it('Equal, exceeded: met, level 1, label "120%"', () => {
    const row = makeRow({ operator: "Equal", actual: 108, budget: 90 });
    const result = evaluate(row);
    expect(result.met).toBe(true);
    expect(result.level).toBe(1);
    expect(result.label).toBe("120%");
  });

  it('Equal, zero budget: met, level 1, label "On target"', () => {
    const row = makeRow({ operator: "Equal", actual: 137.16, budget: 0 });
    const result = evaluate(row);
    expect(result.met).toBe(true);
    expect(result.level).toBe(1);
    expect(result.label).toBe("On target");
  });

  it("Equal, negative actual: not met, level 0", () => {
    const row = makeRow({ operator: "Equal", actual: -842657, budget: 595451 });
    const result = evaluate(row);
    expect(result.met).toBe(false);
    expect(result.level).toBe(0);
  });

  it("LessThan, under budget: met, level ~0.96", () => {
    const row = makeRow({ operator: "LessThan", actual: 1.1, budget: 1.14 });
    const result = evaluate(row);
    expect(result.met).toBe(true);
    expect(result.level).toBeCloseTo(0.9649, 4);
  });

  it('LessThan, over budget: not met, level 1 (full sphere), label "118%"', () => {
    const row = makeRow({ operator: "LessThan", actual: 4.65, budget: 3.95 });
    const result = evaluate(row);
    expect(result.met).toBe(false);
    expect(result.level).toBe(1);
    expect(result.label).toBe("118%");
  });

  it("LessThan, negative actual: met, level 0", () => {
    const row = makeRow({
      operator: "LessThan",
      actual: -946898,
      budget: 445829,
    });
    const result = evaluate(row);
    expect(result.met).toBe(true);
    expect(result.level).toBe(0);
  });

  it("Missing value: no data, empty dashed sphere", () => {
    const missingActual = evaluate(makeRow({ actual: null, budget: 100 }));
    expect(missingActual.hasData).toBe(false);
    expect(missingActual.met).toBe(false);
    expect(missingActual.level).toBe(0);
    expect(missingActual.label).toBe("No data");

    const missingBudget = evaluate(makeRow({ actual: 100, budget: null }));
    expect(missingBudget.hasData).toBe(false);
  });
});

describe("formatValues", () => {
  it("unit written in the name wins over a mismatched symbol: shown as $340M, not 340%", () => {
    const row = makeRow({
      metric: "Capital Placed vs Mandate Target ($M)",
      symbol: "%",
      operator: "Equal",
      actual: 340,
      budget: 310,
    });
    const result = formatValues(row);
    expect(result.actual).toBe("$340M");
    expect(result.budget).toBe("$310M");
  });

  it("percent symbol is suppressed on huge values", () => {
    const row = makeRow({
      metric: "Total Value Processed",
      symbol: "%",
      operator: "Equal",
      actual: 3246160,
      budget: 3000000,
    });
    const result = formatValues(row);
    expect(result.actual).not.toContain("%");
    expect(result.budget).not.toContain("%");
  });

  it("returns empty strings when data is missing", () => {
    const result = formatValues(makeRow({ actual: null, budget: 100 }));
    expect(result).toEqual({ actual: "", budget: "", pair: "" });
  });
});
