import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildModel } from "./buildModel.js";
import { fromLongRows, fromWideRecords } from "./ingest.js";
import type { EvaluatedKpi, KpiRow } from "./types.js";

const fixturesDir = path.resolve(
  fileURLToPath(import.meta.url),
  "../../../../fixtures",
);

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8")) as T;
}

interface GoldenRow {
  node: string;
  group: string;
  subGroup: string;
  metric: string;
  year: number;
  period: string;
  actual: number | null;
  budget: number | null;
  hasData: boolean;
  met: boolean;
  level: number;
  label: string;
  actualStr: string;
  budgetStr: string;
  pair: string;
}

function keyOf(r: {
  node: string;
  group: string;
  subGroup: string;
  metric: string;
}): string {
  return `${r.node}|${r.group}|${r.subGroup}|${r.metric}`;
}

function flatten(kpis: EvaluatedKpi[]): Map<string, EvaluatedKpi> {
  const map = new Map<string, EvaluatedKpi>();
  for (const kpi of kpis) {
    map.set(keyOf(kpi.row), kpi);
  }
  return map;
}

function assertMatchesGolden(rows: KpiRow[], golden: GoldenRow[]) {
  const periods = Array.from(
    new Set(golden.map((g) => `${g.year}::${g.period}`)),
  );
  expect(periods.length).toBe(12);

  for (const key of periods) {
    const [yearStr, period] = key.split("::");
    const year = Number(yearStr);
    const model = buildModel(rows, { year, period: period! });
    const actualByKey = flatten(
      model.nodes.flatMap((n) => [
        ...n.primary,
        ...n.satellite,
        ...n.transferPoints,
      ]),
    );
    const expectedForPeriod = golden.filter(
      (g) => g.year === year && g.period === period,
    );

    expect(actualByKey.size).toBe(expectedForPeriod.length);

    for (const expected of expectedForPeriod) {
      const actual = actualByKey.get(keyOf(expected));
      expect(
        actual,
        `missing KPI for ${keyOf(expected)} in ${period}`,
      ).toBeDefined();
      expect(actual!.row.actual).toBe(expected.actual);
      expect(actual!.row.budget).toBe(expected.budget);
      expect(actual!.hasData).toBe(expected.hasData);
      expect(actual!.met).toBe(expected.met);
      expect(actual!.level).toBeCloseTo(expected.level, 9);
      expect(actual!.label).toBe(expected.label);
      expect(actual!.actual).toBe(expected.actualStr);
      expect(actual!.budget).toBe(expected.budgetStr);
      expect(actual!.pair).toBe(expected.pair);
    }
  }
}

describe("buildModel matches the golden data generated from the prototype", () => {
  it("matches for the wide (prototype DATA) fixture", () => {
    const wide = readJson<unknown[]>("main-dc-prototype.json");
    const golden = readJson<GoldenRow[]>("golden/main-dc-prototype.json");
    const rows = fromWideRecords(wide);
    assertMatchesGolden(rows, golden);
  });

  it("matches for the long (Power BI / API) fixture", () => {
    const long = readJson<{ records: unknown[] }>("bobos-big-block.json");
    const golden = readJson<GoldenRow[]>("golden/bobos-big-block.json");
    const rows = fromLongRows(long.records);
    assertMatchesGolden(rows, golden);
  });
});
