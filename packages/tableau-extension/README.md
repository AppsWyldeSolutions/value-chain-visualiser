# Value Chain Visualiser for Tableau

The Value Chain Visualiser as a Tableau dashboard extension. It is thin glue
around `@appswyldesolutions/vcv-web-component`: it reads a worksheet's data
through Tableau's Extensions API and sets it as the `rows` of a
`<value-chain-visualiser>` element, which does all the drawing. The element
opens with compact cards.

This package is private: it ships as a hosted page plus a `.trex` manifest,
not to npm.

## How it works

- `index.html` loads Tableau's `lib/tableau.extensions.1.latest.js` with a
  plain script tag, as Tableau intends. The library (v1.17.0, Apache-2.0,
  from [tableau/extensions-api](https://github.com/tableau/extensions-api/tree/main/lib))
  is vendored in `public/lib/` and served from the extension's own origin,
  so the extension makes no requests elsewhere. It is not an npm dependency;
  `src/tableau.ts` types the part of it the extension uses.
- `src/extension.ts` calls `tableau.extensions.initializeAsync()`, reads the
  dashboard's first worksheet with `getSummaryDataAsync()`, and sets the
  element's `rows`. It listens for the worksheet's `SummaryDataChanged`
  (filters, parameters, data edits; `FilterChanged` on Tableau versions
  before API 1.9) and reads the data again, redrawing the element in place.
- Problems (no worksheet, missing fields, Tableau errors) show as a line of
  text above the visual.

## Data (sample mapping)

For now the worksheet's fields must be named after the API's long-row fields:
`link`, `group`, `subGroup`, `metric`, `kpiOperator`, `metricValueType`,
`kpiSymbol`, `year`, `january` … `december` and `januaryBudget` …
`decemberBudget`, one mark per long row. Names match loosely: case, spaces,
punctuation and an aggregation such as `SUM(...)` are ignored, so
`SUM(January Budget)` reads as `januaryBudget`. Shaping arbitrary worksheets
is issue #59.

`sample/long-rows.csv` is the fixture (`fixtures/bobos-big-block.json`) in
that shape; `npm run sample -w packages/tableau-extension` regenerates it.

## Develop in Tableau Desktop

1. From the repo root, serve the extension:

   ```sh
   npm start -w packages/tableau-extension
   ```

   Vite serves it at http://localhost:8765, with core, the renderer and the
   web component straight from source, so edits show on reload with no
   build. Tableau allows plain http only for localhost.

2. In Tableau Desktop, connect to `sample/long-rows.csv` and make a
   worksheet: put every text field (`link`, `group`, `subGroup`, `metric`,
   `kpiOperator`, `metricValueType`, `kpiSymbol`) and `year` (as a
   dimension) on Rows or Detail, and the 24 month measures on Detail.
3. Make a dashboard, add the worksheet, then drag **Extension** from Objects
   onto it, choose **Access Local Extensions** and open
   `value-chain-visualiser.dev.trex` from this folder.
4. Change a filter on the worksheet: the visual redraws. To reload the page
   after a code change, use the extension zone's menu → **Reload**.

If the extension shows a blank zone, enable remote debugging (see Tableau's
[Debug extensions in Tableau Desktop](https://tableau.github.io/extensions-api/docs/debug/trex_debugging))
and open the page's console in Chromium.

## Build

`npm run build -w packages/tableau-extension` (part of the root
`npm run build`, after the web component) writes static files to `dist/`.
The build bundles the web component's built `dist/`, not its source. Hosting
them, and a `.trex` pointing at the hosted URL, are a separate issue.

## Test

- Unit tests (`src/*.test.ts`, run by the root `npm test`) drive
  `startExtension` against a fake `window.tableau`.
- `npx playwright test --project=tableau-extension` (part of `npm run e2e`)
  loads the page from the dev server with Tableau's library swapped for a
  fake dashboard, and checks the real library loads and only starts inside
  Tableau.
