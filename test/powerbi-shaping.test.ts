import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fromLongRows, type KpiRow } from "@appswyldesolutions/vcv-core";
import { describe, expect, it } from "vitest";

// docs/powerbi-data-shaping.md reshapes the API's records (one column per
// month) into one row per KPI per period, in Power Query. These tests hold
// it to the fixture that core reads the same records from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const DOC = "docs/powerbi-data-shaping.md";
const QUERY = "samples/powerbi/shape-kpis.pq";
const PBIX = "samples/powerbi/value-chain-sample.pbix";
const EXPORT = "samples/powerbi/shaped-table.tsv";

type Record = { [key: string]: unknown; id: string; link: string };
const RECORDS = (
  JSON.parse(read("fixtures/bobos-big-block.json")) as { records: Record[] }
).records;
const EXPECTED = fromLongRows(RECORDS);

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
];

const FIELDS: (keyof KpiRow)[] = [
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
];

/** Row order does not matter to Power BI, so compare rows as a set. */
const sorted = (rows: KpiRow[]) =>
  rows.map((row) => JSON.stringify(row, FIELDS)).sort();

// Step 6's coercion: "604,000" -> 604000, blank -> no data.
const toNumber = (value: unknown): number | null => {
  const text = String(value ?? "").trim();
  return text === "" ? null : Number(text.replace(/,/g, ""));
};

/** The doc's six steps, one by one, as the M query does them. */
function shape(records: Record[]): KpiRow[] {
  // 1. Expand the records list into columns (blank months kept as "").
  const expanded = records.map((record, recordIndex) => ({
    ...record,
    recordIndex,
  }));
  // 2. Unpivot the twelve actual columns into period and actual.
  const actuals = expanded.flatMap((record) =>
    MONTHS.map((period) => ({ record, period, actual: record[period] ?? "" })),
  );
  // 3. Unpivot the twelve ...Budget columns into period and budget,
  //    stripping the suffix from the month name.
  const budgets = expanded.flatMap((record) =>
    MONTHS.map((month) => ({
      id: record.id,
      period: `${month}Budget`.replace("Budget", ""),
      budget: record[`${month}Budget`] ?? "",
    })),
  );
  // 4. Merge the two on record id and period.
  const budgetOf = new Map(
    budgets.map((b) => [`${b.id}\u0000${b.period}`, b.budget]),
  );
  const merged = actuals.map((a) => ({
    ...a,
    budget: budgetOf.get(`${a.record.id}\u0000${a.period}`),
  }));
  // 5. nodeOrder: each node's first position in the source.
  const nodes = [...new Set(records.map((record) => record.link))];
  // 6. Coerce actual and budget to decimal numbers.
  return merged.map(({ record, period, actual, budget }) => ({
    node: record.link,
    nodeOrder: nodes.indexOf(record.link),
    group: record.group as KpiRow["group"],
    subGroup: String(record.subGroup ?? ""),
    metric: String(record.metric),
    operator: record.kpiOperator as KpiRow["operator"],
    valueType: String(record.metricValueType),
    symbol: String(record.kpiSymbol ?? ""),
    year: Number(record.year),
    period: period.charAt(0).toUpperCase() + period.slice(1),
    actual: toNumber(actual),
    budget: toNumber(budget),
  }));
}

/** Power BI Desktop's "Copy table": tab-separated, a header row first. */
function parseExport(text: string): KpiRow[] {
  const cell = (raw: string) =>
    raw.startsWith('"') && raw.endsWith('"')
      ? raw.slice(1, -1).replace(/""/g, '"')
      : raw;
  const [header, ...lines] = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
  const names = header!.split("\t").map(cell);
  return lines.map((line) => {
    const values = line.split("\t").map(cell);
    const get = (field: keyof KpiRow) => values[names.indexOf(field)] ?? "";
    return {
      node: get("node"),
      nodeOrder: Number(get("nodeOrder")),
      group: get("group") as KpiRow["group"],
      subGroup: get("subGroup"),
      metric: get("metric"),
      operator: get("operator") as KpiRow["operator"],
      valueType: get("valueType"),
      symbol: get("symbol"),
      year: Number(get("year")),
      period: get("period"),
      actual: toNumber(get("actual")),
      budget: toNumber(get("budget")),
    };
  });
}

describe("Power BI data shaping", () => {
  it("the doc's six steps turn the fixture's records into core's rows", () => {
    expect(EXPECTED).toHaveLength(1020);
    expect(shape(RECORDS)).toEqual(EXPECTED);
  });

  it("the doc shows the M query exactly as samples/powerbi has it", () => {
    const query = read(QUERY).replace(/\r\n/g, "\n").trim();
    expect(read(DOC).replace(/\r\n/g, "\n")).toContain(query);
  });

  it("the M query marks each of the six steps", () => {
    const query = read(QUERY);
    for (let step = 1; step <= 6; step++) {
      expect(query, `step ${step}`).toMatch(new RegExp(`// ${step}\\. `));
    }
  });

  it("the table shaped in the sample .pbix equals the fixture", () => {
    expect(
      existsSync(path.join(root, EXPORT)),
      `${EXPORT}: the shaped table copied out of the sample .pbix`,
    ).toBe(true);
    const rows = parseExport(read(EXPORT));
    expect(rows).toHaveLength(EXPECTED.length);
    expect(sorted(rows)).toEqual(sorted(EXPECTED));
  });

  it("the sample .pbix is in the repo and the doc links it", () => {
    expect(existsSync(path.join(root, PBIX)), PBIX).toBe(true);
    expect(read(DOC)).toContain("../samples/powerbi/value-chain-sample.pbix");
  });
});
