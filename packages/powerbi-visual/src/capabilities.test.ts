import { readFileSync } from "node:fs";
import path from "node:path";
import type { KpiRow } from "@appswyldesolutions/vcv-core";
import { describe, expect, it } from "vitest";
import { ROLES } from "./rows";

type Capabilities = {
  dataRoles: { name: string; displayName: string; kind: string }[];
  dataViewMappings: {
    table: {
      rows: {
        select: { for: { in: string } }[];
        dataReductionAlgorithm?: { window?: { count?: number } };
      };
    };
  }[];
  privileges?: unknown[];
};

const capabilities = JSON.parse(
  readFileSync(path.resolve(__dirname, "../capabilities.json"), "utf8"),
) as Capabilities;

// Every KpiRow field, so the check below fails if core adds one.
const FIELDS: Record<keyof KpiRow, true> = {
  node: true,
  nodeOrder: true,
  group: true,
  subGroup: true,
  metric: true,
  operator: true,
  valueType: true,
  symbol: true,
  year: true,
  period: true,
  actual: true,
  budget: true,
};

describe("capabilities.json", () => {
  it("asks for no privileges (web access blocks certification)", () => {
    expect(capabilities.privileges).toEqual([]);
  });

  it("has a data role for every KpiRow field, figures as measures", () => {
    const roles = capabilities.dataRoles.map((role) => role.name);
    expect([...roles].sort()).toEqual(Object.keys(FIELDS).sort());
    expect([...ROLES].sort()).toEqual([...roles].sort());
    for (const role of capabilities.dataRoles) {
      expect(role.kind, role.name).toBe(
        role.name === "actual" || role.name === "budget"
          ? "Measure"
          : "Grouping",
      );
    }
  });

  it("maps every role into one table, in the roles' order", () => {
    const [mapping, ...rest] = capabilities.dataViewMappings;
    expect(rest).toEqual([]);
    expect(mapping!.table.rows.select.map((s) => s.for.in)).toEqual(
      capabilities.dataRoles.map((role) => role.name),
    );
  });

  it("takes up to 30,000 rows, not Power BI's default 1,000", () => {
    const count =
      capabilities.dataViewMappings[0]!.table.rows.dataReductionAlgorithm
        ?.window?.count;
    expect(count).toBeGreaterThanOrEqual(30_000);
  });
});
