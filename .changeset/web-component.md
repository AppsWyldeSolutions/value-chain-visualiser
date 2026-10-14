---
"@appswyldesolutions/vcv-web-component": minor
"@appswyldesolutions/vcv-renderer": minor
---

Web component: add `<value-chain-visualiser>`, which loads KPI data from the URL in `data-src` (or a `rows` property), takes `data-year`, `data-period`, `data-fill-color` and `data-shortfall-color`, and fires `vcv-select` when a sphere is clicked, `vcv-change` when the viewer changes a control and `vcv-error` when the data cannot be loaded.

Renderer: `createVisual` takes an `onSelect(kpi)` option, called when a sphere is clicked, and `kpiOf` returns the KPI behind a `.vcv-kpi` element.
