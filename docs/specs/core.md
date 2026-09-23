# packages/core spec

## Rule table

| Case                          | Input (actual / budget)           | Expected                                     |
| ----------------------------- | --------------------------------- | -------------------------------------------- |
| Equal, short                  | 13,808 / 31,468                   | Not met, level 0.44, label "44%"             |
| Equal, exceeded               | 108 / 90                          | Met, level 1, label "120%"                   |
| Equal, zero budget            | 137.16 / 0                        | Met, level 1, label "On target"              |
| Equal, negative actual        | -842,657 / 595,451                | Not met, level 0                             |
| LessThan, under budget        | 1.10 / 1.14                       | Met, level 0.96                              |
| LessThan, over budget         | 4.65 / 3.95                       | Not met, level 1 (full sphere), label "118%" |
| LessThan, negative actual     | -946,898 / 445,829                | Met, level 0                                 |
| Missing value                 | empty / any                       | No data, empty dashed sphere                 |
| Unit written in the name      | "Capital Placed ($M)", symbol "%" | Shown as $340M, not 340%                     |
| Percent symbol on huge values | 3,246,160 with symbol "%"         | Shown without the % sign                     |

```ts
// packages/core/src/index.ts
export type Operator = "Equal" | "LessThan";
export interface KpiRow {
  node: string;
  nodeOrder: number;
  group: "Primary" | "Satellite" | "Transfer Points";
  subGroup: string;
  metric: string;
  operator: Operator;
  valueType: string;
  symbol: string;
  year: number;
  period: string;
  actual: number | null;
  budget: number | null;
}
export interface Theme {
  fillColor: string;
  shortfallColor: string;
  /* fonts, radii, glass opacity */
}

export function fromWideRecords(json: unknown): KpiRow[]; // the prototype's month-per-column format
export function fromLongRows(rows: unknown[]): KpiRow[]; // the Power BI / API format
export function evaluate(row: KpiRow): {
  met: boolean;
  level: number;
  label: string;
  hasData: boolean;
};
export function formatValues(row: KpiRow): {
  actual: string;
  budget: string;
  pair: string;
};
export function buildModel(
  rows: KpiRow[],
  sel: { year: number; period: string },
): ValueChainVisualiserModel;
```

## `ValueChainVisualiserModel`

`buildModel` filters `rows` down to `sel.year`/`sel.period`, then groups by
`node` (ordered by `nodeOrder`) and, within a node, by `group`. It attaches
`evaluate()` and `formatValues()` results to every row so a host doesn't need
to call them separately. It carries no colour, position or CSS — that's the
renderer's job.

```ts
export interface EvaluatedKpi {
  row: KpiRow;
  met: boolean;
  level: number;
  label: string;
  hasData: boolean;
  actual: string;
  budget: string;
  pair: string;
}
export interface NodeModel {
  node: string;
  nodeOrder: number;
  primary: EvaluatedKpi[];
  satellite: EvaluatedKpi[];
  transferPoints: EvaluatedKpi[];
}
export interface ValueChainVisualiserModel {
  year: number;
  period: string;
  nodes: NodeModel[]; // sorted by nodeOrder
}
```

## Ingestion notes

- `nodeOrder` is the index of each node's first appearance in the input list
  (matches the prototype's own `links` derivation).
- `fromWideRecords` and `fromLongRows` both flatten one input record into 12
  `KpiRow`s, one per calendar month, with `period` set to the capitalised
  month name (e.g. `"August"`) regardless of the input's own "current period"
  field.
- `fixtures/main-dc-prototype.json` (wide) and `fixtures/bobos-big-block.json`
  (long) hold the same 85 KPIs in each shape. `scripts/generate-golden.mjs`
  transcribes the prototype's own evaluation logic (independently of
  `packages/core`) over both fixtures for every month, into
  `fixtures/golden/*.json`; `packages/core/src/golden.test.ts` checks
  `buildModel` against that golden data.
