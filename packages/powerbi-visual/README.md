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

## Format pane

`src/settings.ts` builds the format pane with
`powerbi-visuals-utils-formattingmodel`; `capabilities.json` declares its
objects. On every `update()` the settings become the renderer's theme
(`src/format.ts`), applied with `setTheme`, so a change restyles the drawn
visual in place.

| Card       | Setting          | Control                     | Default                         |
| ---------- | ---------------- | --------------------------- | ------------------------------- |
| Colours    | Fill colour      | colour picker               | the renderer's `fillColor`      |
| Colours    | Shortfall colour | colour picker               | the renderer's `shortfallColor` |
| Background | Ocean            | Ocean, Deep, Lagoon or None | Ocean                           |
| Background | Opacity          | slider, 0–100%              | 100%                            |
| Display    | Transfer Points  | on/off                      | on                              |
| Display    | Sphere size      | slider, 50–150%             | 100%                            |

- **Colours** replace the web component's header colour pickers: on target
  spheres use the fill colour, missed ones the shortfall colour.
- **Ocean** applies one of the renderer's `OCEAN_PRESETS`. **Opacity** is
  `ocean.opacity`: it fades the ocean, not the cards.
- **Transfer Points** off drops the rows in the Transfer Points group, so
  the arrows between cards have no popover.
- **Sphere size** scales every sphere (primary, satellite and the Score
  Card's panels) and the slots they sit in.

## Selection and cross-filtering

`src/selection.ts`: every table row gets a selection id
(`createSelectionIdBuilder().withTable(table, rowIndex)`).

- **Click a sphere** to select its row through Power BI's selection manager,
  which filters the report's other visuals to that KPI and period. The cards
  with no selected KPI dim.
- **Ctrl-click** (cmd-click on a Mac) adds to the selection instead of
  replacing it.
- **Click away** from the spheres to clear the selection; every card returns
  to full opacity.
- When the host changes the selection (a bookmark, or clearing it from
  another visual), the dimming follows; and it is kept across updates.
- A KPI drawn as no data (no row for the period) has no row to select.
- Where the host allows no interactions (`allowInteractions` false, as on a
  dashboard tile) clicks select nothing. A selection the host refuses
  leaves the cards as they were.

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
