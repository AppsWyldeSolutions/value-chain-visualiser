// npm run sample -w packages/tableau-extension: writes sample/long-rows.csv,
// the fixture's long rows as a CSV that Tableau Desktop can connect to. Its
// columns are named after the long-row fields, which is what the extension's
// sample field mapping (src/rows.ts) reads.
import { readFileSync, writeFileSync } from "node:fs";

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
const FIELDS = [
  "link",
  "group",
  "subGroup",
  "metric",
  "kpiOperator",
  "metricValueType",
  "kpiSymbol",
  "year",
  ...MONTHS,
  ...MONTHS.map((month) => `${month}Budget`),
];

const { records } = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/bobos-big-block.json", import.meta.url),
    "utf8",
  ),
);

const cell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const lines = [
  FIELDS.join(","),
  ...records.map((record) => FIELDS.map((f) => cell(record[f])).join(",")),
];
writeFileSync(
  new URL("../sample/long-rows.csv", import.meta.url),
  `${lines.join("\n")}\n`,
);
console.log(`Wrote ${records.length} rows to sample/long-rows.csv`);
