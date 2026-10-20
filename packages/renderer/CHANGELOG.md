# @appswyldesolutions/vcv-renderer

## 2.0.0

### Major Changes

- [#50](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/50) [`afeb7d6`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/afeb7d69728b77b133f52e40371cd929cdecd36d) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Compact card display, now the default.

  **Breaking (default output changes):** without a `cardDisplay`, `createVisual` now draws one compact bar per link in a single row that scales with the visual (CSS container queries) and never wraps; clicking a bar (or Enter/Space on it) opens the link's full card in a popup anchored to it, closed by a second click, Escape or a click elsewhere. Arrows join the bars at their primary spheres; hovering one previews its Transfer Points and a click pins them, one popup at a time. To keep the previous look, pass `cardDisplay: "full"` (renderer), set `data-card-display="full"` (web component) or `cardDisplay="full"` (React).

  Renderer: `cardDisplay` option and `Visual.setCardDisplay(mode)`; `createBar` and `sphereLabel`; a `compact` token group and `motion.popupDuration`; Transfer Points popovers pin on click (`vcv-transfer-pin`, `unpin`). Web component: `data-card-display` attribute. React: `cardDisplay` prop.

### Minor Changes

- [#47](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/47) [`818f1a4`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/818f1a405e93e5cbcbc212765dbb1a1ef5d3ab03) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Renderer: `Visual.setEmpty(message | null)` shows a themed message (set as text, `role="status"`) in place of the chain, for a host with no data to draw yet; `null` shows the chain again.

- [#48](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/48) [`0f1ad85`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/0f1ad85dddde16024cf6171714a6fd0507e983c0) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Renderer: `Visual.setNotice(text | null)` shows a notice between the header and the cards, styled from a new `notice` token group (also covered by `highContrastTheme`); `Visual.setHeader({ eyebrow, title, show, showSubtitle })` edits the heading text and hides the heading or the subtitle after creation. `DEFAULT_HEADING` exports the default eyebrow and title.

- [#43](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/43) [`7f2d44e`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/7f2d44e5a7a1084a1089d24e056773fc3dc2c6f9) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Renderer: add `ocean.opacity` (default `"1"`), which fades the whole ocean background (base colour, gradient, rays, waves and bubbles) without fading the cards, and `OCEAN_PRESETS` (`ocean`, `deep`, `lagoon`, `none`), background looks for `theme.ocean` that restyle a drawn visual in place. The ocean's base colour is now painted on the ocean layer rather than the root.

- [#45](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/45) [`6b21d22`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/6b21d2278907b573805c4bc6be7b80bb41789c44) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Renderer: `createVisual`'s `onSelect` gets a second argument, `{ multi }`, true for a ctrl-click or cmd-click; a new `onDeselect()` is called for a click away from every sphere; and `Visual.setSelectedKpis(isSelected | null)` dims the cards with no selected KPI to the new `card.dimOpacity` token, kept across redraws. For hosts that keep a selection, such as the Power BI visual. Existing `onSelect(kpi)` callers are unaffected.

- [#39](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/39) [`774ecf3`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/774ecf350b4ad91aa1098ff7c1136f5781fcc4d4) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Renderer: `createVisual` takes `showControls` (default `true`). With `false` it draws no Year, Period or colour controls, for a host that sets those itself through `setSelection` and `setTheme`, such as the Power BI visual. Everything else draws unchanged.

- [#46](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/46) [`afd9ad0`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/afd9ad0ff1990910a6335fa6903079926a741664) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - Renderer: `createVisual` takes a `tooltip` option (`show`, `move`, `hide`), called as the pointer moves over KPIs and cards, in place of the native title tooltips; `tooltipItems(target)` gives a target's lines. `highContrastTheme(colors)` and `Visual.setHighContrast(colors | null)` draw the visual flat in a high-contrast mode's colours: no gradients, glass, glow or highlights, solid borders, missed spheres in the hyperlink colour.

- [#52](https://github.com/AppsWyldeSolutions/value-chain-visualiser/pull/52) [`7f01ca4`](https://github.com/AppsWyldeSolutions/value-chain-visualiser/commit/7f01ca4901799ed13ea8307b35eaeeea90b7982b) Thanks [@AppsWyldeSolutions](https://github.com/AppsWyldeSolutions)! - A **View** switch (Compact | Full card) in the visual's header controls lets viewers change the card display at runtime. It starts at the `cardDisplay` given, follows `setCardDisplay` and `data-card-display` without reporting them, and is not shown with `showControls: false`. The change state (`onChange`, `vcv-change`, React's `onChange`) gains `cardDisplay`. New theme tokens: `control.segmentPadding`, `control.selectedBackground`, `control.selectedColor`.

## 1.0.0

First public release on npm.

- Theme: `RendererTheme`, `defaultTheme`, `resolveTheme`, `themeToCssVars` and
  `applyTheme`, with token groups for the card, sphere, connector, popover,
  control and score card.
- Styles and fonts: the `--vcv-*` stylesheet (`stylesText`, `installStyles`)
  and the embedded DM Sans and Bricolage Grotesque fonts (`fontFaceCss`,
  `installFonts`), with their licences in `licenses/`.
- `createShell` (ocean background, header and card grid), `createSphere`,
  `createCard` and `nodeHeading`, `createScoreCard` and `isScoreCard`.
- A responsive card grid, and `createConnectors` with `connectorShape`: the
  arrows between consecutive cards, redrawn on resize, with a Transfer Points
  popover on hover and keyboard focus (`popoverPosition`, `nodeShortName`).
- `createControls` (Year, Period and the two colour pickers) and
  `createVisual`, which builds the whole visual from KPI rows and redraws it
  as the viewer changes them; `defaultSelection`, `PERIODS`, and `onSelect`
  with `kpiOf` for sphere clicks.
