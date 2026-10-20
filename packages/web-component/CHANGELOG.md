# @appswyldesolutions/vcv-web-component

## 2.0.0

### Major Changes

- [#50](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/50) [`afeb7d6`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/afeb7d69728b77b133f52e40371cd929cdecd36d) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Compact card display, now the default.

  **Breaking (default output changes):** without a `cardDisplay`, `createVisual` now draws one compact bar per link in a single row that scales with the visual (CSS container queries) and never wraps; clicking a bar (or Enter/Space on it) opens the link's full card in a popup anchored to it, closed by a second click, Escape or a click elsewhere. Arrows join the bars at their primary spheres; hovering one previews its Transfer Points and a click pins them, one popup at a time. To keep the previous look, pass `cardDisplay: "full"` (renderer), set `data-card-display="full"` (web component) or `cardDisplay="full"` (React).

  Renderer: `cardDisplay` option and `Visual.setCardDisplay(mode)`; `createBar` and `sphereLabel`; a `compact` token group and `motion.popupDuration`; Transfer Points popovers pin on click (`vcv-transfer-pin`, `unpin`). Web component: `data-card-display` attribute. React: `cardDisplay` prop.

### Minor Changes

- [#52](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/52) [`7f01ca4`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/7f01ca4901799ed13ea8307b35eaeeea90b7982b) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - A **View** switch (Compact | Full card) in the visual's header controls lets viewers change the card display at runtime. It starts at the `cardDisplay` given, follows `setCardDisplay` and `data-card-display` without reporting them, and is not shown with `showControls: false`. The change state (`onChange`, `vcv-change`, React's `onChange`) gains `cardDisplay`. New theme tokens: `control.segmentPadding`, `control.selectedBackground`, `control.selectedColor`.

- [#54](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/54) [`a5503dd`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/a5503dd01c1b1c85ac25b565dd861a64541110c6) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Web component: a `cardDisplay` property. Setting it sets `data-card-display` (anything but `"full"` is compact); reading it gives the display shown, including a viewer's choice in the header's View switch.

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
