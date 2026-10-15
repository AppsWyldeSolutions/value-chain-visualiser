# @appswyldesolutions/vcv-renderer

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
