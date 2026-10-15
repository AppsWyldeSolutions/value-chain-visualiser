# @appswyldesolutions/vcv-web-component

## 1.0.0

First public release on npm.

- `<value-chain-visualiser>`: loads KPI data from the URL in `data-src` (or a
  `rows` property), takes `data-year`, `data-period`, `data-fill-color` and
  `data-shortfall-color`, and fires `vcv-select` when a sphere is clicked,
  `vcv-change` when the viewer changes a control and `vcv-error` when the data
  cannot be loaded.
- One install: core and the renderer are bundled in, so the package has no
  runtime dependencies. ESM, CJS and type declarations, plus `./browser`
  (`dist/vcv.iife.js`), one file for a `<script>` tag that puts the exports
  on `window.ValueChainVisualiser`.
- Importing the package root registers nothing. Import `./define`, or call
  `defineValueChainVisualiser()`, to register the element; only that entry
  has side effects.
- Exports the `KpiRow` type, so hosts can type `rows` without installing core.
