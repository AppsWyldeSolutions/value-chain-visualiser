# Value Chain Visualiser for Power BI

The Value Chain Visualiser as a Power BI custom visual, scaffolded with
`pbiviz new` (powerbi-visuals-tools 7, API 5.11.1). It draws the visual with
`@appswyldesolutions/vcv-renderer`'s `createVisual`, with
`showControls: false`: Power BI's filters and format pane own the selection
and colours.

This package is private: it ships as a `.pbiviz` file, not to npm. It
depends on `@appswyldesolutions/vcv-core` and `@appswyldesolutions/vcv-renderer`
by their npm versions, so it also builds outside this monorepo. Inside it,
npm links them to `packages/core` and `packages/renderer`, and their built
`dist` is what gets bundled: build them first (the root `npm run build` does).

## Develop

1. Once per machine, trust the pbiviz development certificate:
   `npx pbiviz install-cert`.
2. In the Power BI service, turn on developer mode (Settings → Developer
   settings → "Turn on developer mode").
3. From the repo root, build the packages it uses, then serve the visual:

   ```sh
   npm run build -w packages/core -w packages/renderer
   npm start -w packages/powerbi-visual
   ```

4. In a report, add the **Developer Visual** from the Visualizations pane.

## Package

`npm run build -w packages/powerbi-visual` (`pbiviz package`) writes
`dist/*.pbiviz`.

## Data

One data role per `KpiRow` field, mapped as a table (`capabilities.json`).
`src/rows.ts`'s `rowsFromTable` reads each field from the column bound to
its role, so the report's own field names and column order do not matter.

| Role        | Kind     | KpiRow field | In the API's long rows      |
| ----------- | -------- | ------------ | --------------------------- |
| Node        | Grouping | `node`       | `link`                      |
| Node order  | Grouping | `nodeOrder`  | (order of first appearance) |
| Group       | Grouping | `group`      | `group`                     |
| Sub-group   | Grouping | `subGroup`   | `subGroup`                  |
| Metric      | Grouping | `metric`     | `metric`                    |
| Operator    | Grouping | `operator`   | `kpiOperator`               |
| Value type  | Grouping | `valueType`  | `metricValueType`           |
| Unit symbol | Grouping | `symbol`     | `kpiSymbol`                 |
| Year        | Grouping | `year`       | `year`                      |
| Period      | Grouping | `period`     | the month                   |
| Actual      | Measure  | `actual`     | the month's actual          |
| Budget      | Measure  | `budget`     | the month's budget          |

- **Required:** Node, Group, Metric, Year and Period. Until all five are
  bound the visual draws an empty chain.
- **Optional:** the rest. Unbound, Operator reads as `Equal`, Value type as
  `Number`, Node order as 0, and Actual and Budget as no data.
- **Value type is its own role.** It cannot be derived from the unit symbol:
  some `%` KPIs are counted as numbers in the source data (for example
  "90% of Corner Stones achieved by Process").
- **Up to 30,000 rows** (`dataReductionAlgorithm.window.count`); Power BI's
  default stops at 1,000, which a year of KPIs exceeds.
- **`privileges` stays empty.** Asking for web access would block
  certification.

## Tests

- `src/*.test.ts` (Vitest, in the root `npm run test`): the table mapping
  (against `fixtures/bobos-big-block.json`), `capabilities.json`, and the
  `Visual` class in jsdom.
- `test/e2e/powerbi-visual.spec.ts` (the `powerbi-visual` project in the root
  `npm run e2e`): loads the packaged bundle (`.tmp/drop/visual.js`) in
  Chromium the way Power BI does, through the plugin it registers on
  `window.powerbi`, and checks it draws with no errors and no network
  requests. It needs `npm run build` first.

## Layout and config

The files stay where `pbiviz new` put them: `pbiviz.json`,
`capabilities.json`, `src/visual.ts`, `style/visual.less` and `assets/`.
`tsconfig.json` differs from the scaffold in a few settings. pbiviz reads it
as plain JSON, so the reasons are noted here rather than in comments:

- `moduleResolution: "bundler"`: TypeScript 6 no longer accepts the
  scaffold's `node` (node10).
- `strict: true`, as in every package. pbiviz compiles its generated
  `.tmp/precompile/visualPlugin.ts` in the same program as `src/`, with this
  config, so strict applies to it too. That file calls `new Visual(options)`
  with an optional argument, so `Visual`'s constructor takes `options?` (and
  throws if it is missing) to keep the generated file compiling.
- `rootDir: "."`: TypeScript 6 wants `rootDir` set alongside `outDir`. It
  is the package folder, not `src/`, because pbiviz compiles its generated
  `.tmp/precompile/visualPlugin.ts` in the same program, and `rootDir` must
  contain every file compiled.
- `skipLibCheck: true`: `powerbi-visuals-api`'s declarations use
  `module` namespaces, which TypeScript 6 rejects.
- `types: []`: the visual runs in a browser sandbox and needs no Node types.
- `src/less.d.ts` lets `visual.ts` import its stylesheet.

In this monorepo npm hoists `powerbi-visuals-api` to the root, but pbiviz
looks for it in this package's `node_modules`. The root `postinstall`
(`scripts/link-powerbi-api.mjs`) links it there. A standalone copy of this
package needs nothing of the sort.
