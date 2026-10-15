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

For now the visual takes one data role, **KPI fields**, as a table, and maps
it with a stub: each `KpiRow` field (`node`, `nodeOrder`, `group`,
`subGroup`, `metric`, `operator`, `valueType`, `symbol`, `year`, `period`,
`actual`, `budget`) is read from the column of the same name, in any case.
The real mapping from a report's own columns replaces it.

## Tests

- `src/*.test.ts` (Vitest, in the root `npm run test`): the stub mapping, and
  the `Visual` class in jsdom.
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
- `strict: false`: pbiviz compiles its generated
  `.tmp/precompile/visualPlugin.ts` with this config, and that file does not
  pass strict checks. TypeScript 6 turns `strict` on by default.
- `skipLibCheck: true`: `powerbi-visuals-api`'s declarations use
  `module` namespaces, which TypeScript 6 rejects.
- `types: []`: the visual runs in a browser sandbox and needs no Node types.
- `src/less.d.ts` lets `visual.ts` import its stylesheet.

In this monorepo npm hoists `powerbi-visuals-api` to the root, but pbiviz
looks for it in this package's `node_modules`. The root `postinstall`
(`scripts/link-powerbi-api.mjs`) links it there. A standalone copy of this
package needs nothing of the sort.
