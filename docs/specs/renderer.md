# packages/renderer spec

Vanilla DOM/SVG/CSS only. The renderer builds elements with `createElement`
and `textContent`, never `innerHTML`, and makes no network calls. The look
follows `docs/prototype/Main.dc.html`.

This file covers the renderer as built in Step 4: the shell (issue #6), the
sphere (#7), the card (#8), the responsive grid and connectors (#9), the
transfer points popover (#10), the Score Card (#11), the header controls
with `createVisual`, which puts them together (#12), and the web component
that wraps it (#13).

## Theme

`RendererTheme` extends core's `Theme` (`fillColor`, `shortfallColor`) with
every other colour, size and font the renderer uses. `defaultTheme` holds the
prototype's values.

| Group       | Tokens                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (top)       | `fillColor`, `shortfallColor`                                                                                                                                                                                                                                                                                                                                         |
| `fonts`     | `body`, `display`                                                                                                                                                                                                                                                                                                                                                     |
| `colors`    | `text`, `textSoft`, `textMuted`, `textLabel`, `focusRing`                                                                                                                                                                                                                                                                                                             |
| `ocean`     | `opacity`, `base`, `gradient`, `rayColor`, `rayTop`, `rayAngle`, `rays[]`, `waveColor`, `waveHeight`, `waveOpacities[]`, `bubbleBorder`, `bubbleBorderWidth`, `bubbleFill`, `bubbles[]`                                                                                                                                                                               |
| `glass`     | `cardBackground`, `cardBorder`, `cardShadow`, `blur`, `saturate`, `line`, `pillBackground`, `pillBorder`, `controlBackground`, `controlBorder`                                                                                                                                                                                                                        |
| `sphere`    | `size`, `glass`, `shadow`, `ringWidth`, `ringOpacity`, `emptyRing`, `glowScale`, `glowOpacity`, `tint`, `liquidTint`, `liquidTopOpacity`, `liquidBottomOpacity`, `meniscusTint`, `meniscusOpacity`, `meniscusScale`, `highlight`, `highlightLow`                                                                                                                      |
| `card`      | `dimOpacity`, `padding`, `gap`, `minHeight`, `headerHeight`, `eyebrowSize`, `titleSize`, `pillSize`, `rowLabelSize`, `primarySphereSize`, `primarySlot`, `primaryPercentSize`, `primaryLabelSize`, `primaryValueSize`, `satelliteSphereSize`, `satelliteSlot`, `satelliteMinSlot`, `satelliteGap`, `satellitePercentSize`, `satelliteLabelSize`, `satelliteValueSize` |
| `connector` | `stroke`, `strokeWidth`, `dash`, `head`, `headLength`, `headWidth`, `cornerRadius`, `startGap`, `rowAnchor`, `hitPadding`                                                                                                                                                                                                                                             |
| `popover`   | `width`, `padding`, `background`, `border`, `shadow`, `blur`, `offset`, `margin`, `titleSize`, `tagSize`                                                                                                                                                                                                                                                              |
| `score`     | `padding`, `gap`, `minHeight`, `primarySlot`, `primaryMinSlot`, `primaryGap`, `panelMinWidth`, `panelPadding`, `panelBackground`, `panelSphereSize`, `panelSlot`, `panelMinSlot`, `panelGap`, `panelPercentSize`, `panelLabelSize`, `panelValueSize`                                                                                                                  |
| `control`   | `height`, `fontSize`, `labelSize`, `yearMinWidth`, `periodMinWidth`, `swatchWidth`, `optionColor`, `optionBackground`                                                                                                                                                                                                                                                 |
| `radii`     | `card`, `popover`, `panel`, `control`, `pill`                                                                                                                                                                                                                                                                                                                         |
| `layout`    | `contentWidth`, `gutter`, `paddingTop`, `paddingBottom`, `headerHeight`, `headerGap`, `controlsGap`, `columns`, `cardMinWidth`, `columnGap`, `rowGap`                                                                                                                                                                                                                 |
| `type`      | `eyebrowSize`, `titleSize`, `subtitleSize`                                                                                                                                                                                                                                                                                                                            |
| `motion`    | `bubbleDuration`, `bubbleRise`, `flowDuration`                                                                                                                                                                                                                                                                                                                        |

```ts
export function resolveTheme(
  overrides?: ThemeOverrides,
  base?: RendererTheme,
): RendererTheme;
export function themeToCssVars(theme: RendererTheme): Record<string, string>;
export function applyTheme(element: HTMLElement, theme: RendererTheme): void;
```

- `resolveTheme` lays overrides over the base one group at a time; a token
  left out or `undefined` keeps the base value. List tokens are replaced whole.
- `themeToCssVars` turns each scalar token into a custom property:
  `colors.textMuted` becomes `--vcv-colors-text-muted`, `fillColor` becomes
  `--vcv-fill-color`. List tokens (`rays`, `waveOpacities`, `bubbles`) are not
  emitted; the shell builds one element per entry.
- The stylesheet (`stylesText`) contains no colour, size or font literals of
  its own. It only reads `--vcv-*` properties, so a host restyles the visual
  by changing the theme, not the CSS.

### Ocean opacity and presets

- `ocean.opacity` (`"0"` to `"1"`, default `"1"`) fades the whole ocean
  layer: its base colour, gradient, rays, waves and bubbles. The base colour
  is painted on the ocean layer, not the root, so below 1 the page behind
  the visual shows through. The cards are not faded.
- `OCEAN_PRESETS` holds four background looks for `theme.ocean`: `ocean`
  (the default theme's), `deep` (darker navy, dimmer rays), `lagoon`
  (lighter teal) and `none` (no ocean: every ocean colour transparent and
  the gradient `none`). Each sets the same colour tokens (`base`,
  `gradient`, `rayColor`, `waveColor`, `bubbleBorder`, `bubbleFill`),
  so applying one fully replaces another, and only string tokens, so
  `setTheme({ ocean: OCEAN_PRESETS.deep })` restyles a drawn visual without
  rebuilding its rays and bubbles.

## Fonts

DM Sans 400/500/700 and Bricolage Grotesque 700 (Latin subset) are embedded
as base64 woff2 in `fontFaceCss`, so nothing is fetched at runtime.
`src/fonts.generated.ts` is written by `node scripts/embed-fonts.mjs` from the
`@fontsource` devDependencies; a unit test fails if it goes stale. Both fonts
are under the SIL Open Font License 1.1 (`packages/renderer/licenses`).

`@font-face` rules are ignored inside a shadow root, so `installFonts(doc)`
always adds them to the document head, while `installStyles` adds the
stylesheet to whichever root the shell lives in.

## Shell

```ts
export function createShell(
  container: HTMLElement,
  options?: {
    theme?: ThemeOverrides;
    eyebrow?: string; // default "Value chain"
    title?: string; // default "Business Processes & Scorecard"
    subtitle?: string;
  },
): Shell;

export interface Shell {
  root: HTMLElement;
  controls: HTMLElement; // empty header slot for the Year/Period/colour controls
  grid: HTMLElement; // empty card grid
  setTheme(overrides: ThemeOverrides): void;
  setSubtitle(text: string): void;
  destroy(): void;
}
```

`createShell` installs the stylesheet and fonts (once per root/document),
then appends:

```
.vcv-root                 theme custom properties live here
  .vcv-ocean              aria-hidden; gradient, rays, surface waves, bubbles
  .vcv-content
    header.vcv-header
      .vcv-header__heading   eyebrow, h1 title, subtitle
      .vcv-header__controls
    .vcv-grid
```

### Differences from the prototype

- The prototype is a fixed 1440 x 2872 canvas with rays and bubbles placed in
  pixels. The shell fills its container, so ray heights and bubble positions
  are percentages of the shell's height (the same proportions as the
  prototype at 2872px), and the content column is
  `min(contentWidth, 100% - 2 * gutter)`.
- Class and keyframe names are prefixed `vcv-` (`vcv-rise`, `vcv-flow`).

### Motion

Bubbles rise on a loop (`vcv-rise`). Under `prefers-reduced-motion: reduce`
the bubble and connector-flow animations are switched off and the bubbles
stay where the theme places them.

## Sphere

```ts
export interface SphereState {
  level: number; // fill height, 0 to 1
  met: boolean; // on target: fill colour; otherwise shortfall colour
  hasData: boolean; // false: empty dashed sphere
}

export function createSphere(
  doc: Document,
  state: SphereState,
  options?: {
    size?: string; // CSS length; default is the theme's sphere.size
    label?: string; // accessible name
  },
): Sphere;

export interface Sphere {
  element: HTMLElement;
  update(state: SphereState): void;
}
```

`SphereState` is the shape of core's `Evaluation`, so an `EvaluatedKpi` from
`buildModel` can be passed in as it is. The sphere draws only the orb; the
percentage, metric name and values beside it belong to the card.

```
.vcv-sphere                  the glass shell; its border is the ring
  .vcv-sphere__liquid        height = level
    .vcv-sphere__meniscus    the liquid's surface
  .vcv-sphere__highlight
  .vcv-sphere__highlight--low
```

| State    | Example (actual / budget) | Classes on `.vcv-sphere` | Drawn as                                         |
| -------- | ------------------------- | ------------------------ | ------------------------------------------------ |
| Met      | LessThan, 7 / 10          | `--met --partial`        | Fill colour to 70%, with a meniscus              |
| Short    | Equal, 13,808 / 31,468    | `--missed --partial`     | Shortfall colour to 44%, with a meniscus         |
| Exceeded | Equal, 108 / 90           | `--met`                  | Full sphere in the fill colour                   |
| Full     | LessThan, 4.65 / 3.95     | `--missed`               | Full sphere in the shortfall colour              |
| Empty    | Equal, 0 / 90             | `--missed`               | No liquid; ring and glow in the shortfall colour |
| No data  | actual or budget missing  | `--no-data`              | No liquid, no glow, dashed neutral ring          |

- The level is clamped to 0..1 and ignored when there is no data. The
  meniscus shows only when the sphere is partly filled.
- Without a `label` the sphere is `aria-hidden`; with one it is `role="img"`
  with that name.
- Colours are derived in CSS with `color-mix()` from `--vcv-fill-color` and
  `--vcv-shortfall-color`: the ring, glow, liquid gradient and meniscus are
  that colour at the opacities and tints in the theme's `sphere` group. A
  theme change therefore recolours existing spheres with no `update` call,
  and any CSS colour works, not only hex. The prototype did the same maths
  in JavaScript on hex values.
- Glow radius and meniscus height scale with the diameter
  (`sphere.glowScale`, `sphere.meniscusScale`).

## Card

```ts
export function createCard(doc: Document, node: NodeModel): Card;
export interface Card {
  element: HTMLElement;
}

export function nodeHeading(node: string): { eyebrow: string; title: string };
```

`createCard` takes one node of core's `ValueChainVisualiserModel` and builds
the glass card for a process:

```
article.vcv-card              aria-labelledby its title
  .vcv-card__header
    .vcv-card__heading        eyebrow + h2 title (2 lines at most)
    .vcv-card__pill           "3 of 5 on target"
  .vcv-card__rows
    .vcv-kpi-row--primary     label "Primary KPI" / "Primary KPIs"
      .vcv-kpi--primary       sphere, percentage, metric name, actual / budget
    .vcv-kpi-row--satellite   label "Satellite KPIs", ruled off above
      .vcv-kpi--satellite
```

- **Heading.** `nodeHeading` splits the node name:
  `BU1 - P2: Product Development` gives `BU1 · P2` / `Product Development`,
  `Process 1 – Intake` gives `Process 1` / `Intake`, and any other name is
  shown whole under the eyebrow `Link`.
- **Count pill.** Counts the primary and satellite KPIs that have data and how
  many of them are on target. With no data at all it reads `No data`.
  Transfer points are not on the card and are not counted; they belong to the
  connector popover.
- **Rows.** A row with no KPIs is left out. Primary KPIs use the large sphere
  (`card.primarySphereSize`), satellites the small one
  (`card.satelliteSphereSize`). Each KPI is at most its slot wide
  (`card.primarySlot`, `card.satelliteSlot`). Primary KPIs shrink to share
  the row; satellites shrink to `card.satelliteMinSlot` and then wrap.
- **KPI text.** The percentage is core's `label`, the name is the metric, and
  the figures are core's `pair`. A KPI without data shows `No data`, an empty
  dashed sphere and no figures.
- **Tooltip.** Each KPI's `title` holds the full detail, one fact per line:
  metric, period and year, actual, budget, the rule
  (`actual at or above budget` or `actual at or under budget`) and the status
  (`Target met`, `Below budget`, `Over budget`, or
  `No data for this period`).
- **Accessibility.** The spheres are `aria-hidden` because the text beside
  them carries the same information.

### Differences from the prototype

- Cards are at least `card.minHeight` (608px) tall instead of exactly that,
  so a card with more text grows, and cards in one grid row share a height.
- Long words in a metric name wrap (`overflow-wrap: break-word`) instead of
  being cut off at the edge of a narrow satellite slot.

## Grid

The shell's `.vcv-grid` chooses its own column count from its width, in CSS
alone:

- It fits as many columns as it can while keeping cards at least
  `layout.cardMinWidth` (340px) wide, up to `layout.columns` (3).
- A container narrower than one minimum-width card gets a single column as
  wide as the container.
- The count follows the container, not the window, so it works the same in a
  Power BI visual, a web component or a full page.

| Viewport | Content width | Columns | Card width |
| -------- | ------------- | ------- | ---------- |
| 1440px   | 1384px        | 3       | 424px      |
| 900px    | 844px         | 2       | 394px      |
| 480px    | 424px         | 1       | 424px      |

Inside a card, a satellite row wraps onto another line once its KPIs would
be narrower than `card.satelliteMinSlot` (70px), so the spheres never
overlap: five satellites sit on one line in a 424px card and break 4 + 1 in
a 394px one.

## Connectors

```ts
export function createConnectors(grid: HTMLElement): Connectors;
export interface Connectors {
  element: SVGSVGElement; // the overlay the arrows are drawn in
  update(): void; // re-measure and redraw
  destroy(): void;
}

// The geometry on its own, with no DOM:
export function connectorShape(
  from: Box,
  to: Box,
  metrics: ConnectorMetrics,
): ConnectorShape | null;
```

`createConnectors` adds an `aria-hidden` SVG overlay to the grid and draws
one arrow from each `.vcv-card` child to the next, in document order. Because
the columns come from CSS, the arrows are measured: each one is worked out
from where the two cards actually are.

| Kind     | When                                               | Path                                                              |
| -------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `across` | The next card is to the right in the same row      | Across the column gap, `connector.rowAnchor` down the card        |
| `down`   | The next card is below and covers this one's width | Straight down the row gap from this card's centre                 |
| `turn`   | The next card is below, in another column          | Down, along the middle of the row gap, down to that card's centre |

- Every arrow head ends exactly on the next card's edge: its left edge for
  `across`, its top edge for `down` and `turn`.
- A `down` arrow is what a single-column layout uses, and what the last
  process will use to reach a card that spans the row (the Score Card).
- No arrow is drawn when a card has no size yet, the two cards overlap, or
  the next card comes before this one.
- The overlay redraws when the grid or any card changes size
  (`ResizeObserver`) and when cards are added or removed
  (`MutationObserver`). Call `update()` after any other change that moves
  cards.
- Measurements are divided by any CSS scale a host applies to the visual, so
  the arrows stay on the edges when it is zoomed.
- Arrow sizes come from the theme's `connector` group and must be pixel
  lengths, because they are read back as numbers.
- The dashes flow along the line (`vcv-flow`) and stop under
  `prefers-reduced-motion: reduce`.

### Differences from the prototype

- The prototype is three fixed columns with arrows at hand-placed pixel
  positions. Here the column count is responsive and the arrows are measured.
- Every arrow starts `connector.startGap` (2px) clear of the card it leaves.
  The prototype did this for the across arrows only.

## Transfer points popover

An arrow leaving a card that `createCard` built, whose node has transfer
points, shows them in a popover. `createConnectors` sets this up itself; there
is nothing extra for a host to call.

```
.vcv-transfers                 layer over the grid, beside the arrows' SVG
  .vcv-transfer                hover and focus target over one arrow
    .vcv-popover               hidden until the target is hovered or focused
      .vcv-popover__panel
        .vcv-popover__header   "Transfer points", "BU1 · P2 → BU2 · P3", pill
        .vcv-popover__items    one .vcv-kpi--satellite per transfer point,
                               with its sub-group as a .vcv-kpi__tag heading
```

- **Target.** A `tabindex="0"` element with `role="group"` and the name
  `Transfer points from BU1 · P2 to BU2 · P3`. It covers the arrow's whole
  run, `connector.hitPadding` (16px) either side of it: the column gap for an
  across arrow, the row gap for a down or turn arrow. Targets are in chain
  order for the Tab key.
- **Names.** A link is referred to by its code when its name has one
  (`BU1 · P2`) and by its whole name otherwise (`Score Card`);
  `nodeShortName` does this.
- **Opening.** The popover shows while the target is hovered or has keyboard
  focus. The popover is inside the target and touches it, so the pointer can
  move from the arrow onto the popover without closing it.
- **Escape** closes it, whether it was opened by hover or by focus, and it
  stays closed until the target is entered or focused again. Focus does not
  move.
- **Position.** Centred below the target; above it when there is no room
  below; and always at least `popover.margin` (8px) inside both the viewport
  and the visual's own box, which clips its overflow. `popoverPosition` holds
  this rule with no DOM. The position is recalculated on scroll, on resize and
  when the arrows are redrawn.
- **Contents.** The pill counts the transfer points on target, as the card's
  pill does for its KPIs. Each transfer point is drawn like a satellite KPI
  with its sub-group (`CornerStones`, `Unit Rate`, ...) above the sphere.
- A target, with its open state and focus, survives a redraw of the arrows.
  It is rebuilt only if the arrow comes to point at a different card.

### Differences from the prototype

- The prototype shows the popover with CSS `:hover` and `:focus` alone, so
  Escape does nothing and the popover can run off the screen. Here both are
  handled in script.
- The prototype's turn arrow responds over a fixed 960px strip; here the
  target follows the measured arrow.

## Score Card

```ts
export function isScoreCard(node: NodeModel): boolean;
export function createScoreCard(doc: Document, node: NodeModel): Card;
```

The Score Card closes the chain. A host builds each node with
`isScoreCard(node) ? createScoreCard(doc, node) : createCard(doc, node)`.

```
article.vcv-card.vcv-card--score     spans every column of the grid
  .vcv-card__header                  eyebrow "Outcome", title, count pill
  .vcv-card__rows
    .vcv-kpi-row--primary            "Primary KPIs", large spheres
    .vcv-card__panels
      .vcv-kpi-row--panel            one per sub-group, labelled with its name
        .vcv-kpi--panel
```

- **Recognised by its data, not its name.** A node is a Score Card when any
  of its KPIs has a group or sub-group ending in `Scorecard`, as in the
  prototype.
- **No satellite row.** Satellites are shown in panels, one per sub-group,
  in the order the sub-groups first appear. A satellite with no sub-group is
  not shown and not counted.
- **Older data shape.** Rows whose group is itself the scorecard name
  (`Financial Scorecard`) also form a panel. Core files such rows under
  `transferPoints`, so they are picked up from there.
- **Count pill.** Counts the primary KPIs and the KPIs in the panels.
- **Heading.** The eyebrow is `Outcome` and the title is the node's name.
- **Sizes** come from the theme's `score` group: primary KPIs use the card's
  large sphere, panel KPIs an 84px one (`score.panelSphereSize`).
- **Responsive.** The card always spans the grid. Panels sit side by side
  while each can be at least `score.panelMinWidth` wide and stack otherwise;
  the primary row and each panel wrap before their spheres would overlap.
- Because it is a `.vcv-card`, `createConnectors` ends the chain's last arrow
  on it: straight down from the last process, whose transfer points popover
  reads `BU5 · P3 → Score Card`.

### Differences from the prototype

- The prototype sizes panels and their spheres in script from a fixed 1334px
  width, dropping to 72px spheres when a panel is crowded. Here the layout is
  CSS: panel spheres are always 84px and a crowded panel wraps.
- The card is at least `score.minHeight` (640px) tall instead of exactly
  that.
- The prototype's "How to read a sphere" key, which sits in the grid beside
  the last row of cards, is not part of this issue and is not built.

## Header controls

```ts
export function createControls(
  doc: Document,
  options: {
    years: number[];
    periods: string[];
    value: ControlsValue; // { year, period, fillColor, shortfallColor }
    onChange(change: Partial<ControlsValue>): void;
  },
): Controls; // { element, update(value, years?) }
```

Four labelled controls, as in the prototype: **Year** and **Period** selects,
then **Fill colour** and **Shortfall colour** pickers (named
`Fill colour when target is met` and `Fill colour when target is missed` for
assistive tech).

- `onChange` receives only the field the viewer changed. Selects report on
  `change`; pickers report on `input`, so spheres recolour while a colour is
  being dragged.
- `update` shows a new value without calling `onChange`.
- A colour picker only takes `#rrggbb`. A three-digit hex is spelt out; any
  other CSS colour in the theme leaves the picker showing its last value.
- Sizes and the colours of a select's open list come from the theme's
  `control` group; borders and backgrounds from `glass.controlBorder` and
  `glass.controlBackground`.

## Visual

```ts
export function createVisual(
  container: HTMLElement,
  options: {
    rows: KpiRow[];
    selection?: { year: number; period: string }; // default: defaultSelection(rows)
    theme?: ThemeOverrides;
    eyebrow?: string;
    title?: string;
    showControls?: boolean; // default true
    onChange?(state: VisualState): void; // year, period, fillColor, shortfallColor
  },
): Visual;

export interface Visual {
  root: HTMLElement;
  setRows(rows: KpiRow[]): void;
  setSelection(selection: { year: number; period: string }): void;
  setTheme(overrides: ThemeOverrides): void;
  state(): VisualState;
  destroy(): void;
}

export function defaultSelection(rows: KpiRow[]): {
  year: number;
  period: string;
};
```

`createVisual` puts the pieces together: the shell, the controls in its
header, a card for every link (`createScoreCard` for the Score Card,
`createCard` for the rest) and `createConnectors` over the grid. It is what a
host such as the web component wraps.

- **Period or Year changed**: the cards are rebuilt from `rows` with
  `buildModel` for the new selection. The arrows redraw themselves because
  the grid's cards changed.
- **Colour changed**: the theme's `fillColor` or `shortfallColor` is updated.
  Spheres take their colour from CSS custom properties, so they recolour
  without being rebuilt.
- **Every link is always drawn.** A KPI with no row for the selection (a
  year the data does not cover, say) is drawn as having no data, as the
  prototype does, rather than disappearing.
- **Subtitle**: `August 2026 · 53 KPIs measured against budget`, counting the
  KPIs on the cards that have data (not the transfer points), or
  `August 2027 · No data loaded for this period`.
- **Default selection**: the latest year in the rows and, in it, the last
  month with any actuals. January if no month has actuals.
- **Year choices**: the years in the rows plus one either side, as in the
  prototype.
- `onChange` is called only for the viewer's own changes, with the whole new
  state. `setRows`, `setSelection` and `setTheme` update the visual and its
  controls without calling it, so a host can feed state back in safely.
- **`showControls: false`**: no Year, Period or colour controls, and no
  empty slot for them; the header keeps its eyebrow, title and subtitle, and
  the cards, spheres, arrows and Transfer Points draw as usual. For a host
  that owns those choices itself, such as Power BI (its filters and format
  pane), which sets them through `setSelection` and `setTheme`.

### Selecting a KPI

`createVisual`'s `onSelect(kpi)` option is called with the `EvaluatedKpi`
when a sphere is clicked, on a card or in a transfer points popover. Clicks
elsewhere (the KPI's name or figures, a card title) are ignored. When
`onSelect` is given the root gets `vcv-root--selectable` and the spheres show
a pointer. `kpiOf(element)` returns the KPI a `.vcv-kpi` element was built
from.

- **`onSelect(kpi, { multi })`**: `multi` is true for a ctrl-click
  (cmd-click on a Mac), meaning add to the selection rather than replace it.
- **`onDeselect()`** is called for a click that lands away from every
  sphere, except on the header controls and the transfer points targets: a
  host clears its selection.
- **`setSelectedKpis(isSelected | null)`** on the `Visual` dims every
  card none of whose KPIs (its transfer points included) `isSelected`
  accepts, to `card.dimOpacity` (`0.35`), with `vcv-card--dimmed`. `null`
  shows every card in full. It is kept when the cards are redrawn for another
  period. The renderer keeps no selection of its own: the host decides what
  is selected and says so.

### Tooltips

Without a host's own tooltips, each KPI has a native `title` tooltip
(`kpiTooltip`). `createVisual`'s `tooltip` option takes `show`, `move` and
`hide` handlers instead, and the native titles are then left out:

- `show(target, point)` when the pointer reaches a target, `move` while it
  moves over the same one, `hide()` when it is over none or leaves the
  visual. `point` is `{ x, y }` in viewport coordinates.
- A target is `{ kind: "kpi", kpi }` over a KPI (its sphere, name or
  figures, on a card or in a transfer points popover), or
  `{ kind: "card", node }` elsewhere on a card.
- `tooltipItems(target)` gives its lines as `{ displayName, value }`: for a
  KPI, KPI, Period, Actual, Budget, Rule and Status (KPI, Period and "No
  data for this period" without figures); for a card, Link and On target
  ("3 of 5").

### Empty state

`Visual.setEmpty(message | null)` shows `message` (as text, in a
`p.vcv-empty` with `role="status"`) in place of the cards, arrows and
subtitle, styled from the theme (display font, subtitle size, soft text
colour, the gutter as padding); `null` shows the chain again. For a host
with no data to draw yet, such as the Power BI visual before its required
fields are added.

### High contrast

`highContrastTheme({ foreground, background, foregroundSelected, hyperlink })`
is a flat theme in those colours only: every colour token in one of them,
no gradients, glass, glow or shadows. Spheres on target fill in the
foreground colour and missed ones in the hyperlink colour; borders, rings
and arrows are solid foreground, focus is `foregroundSelected`.

`Visual.setHighContrast(colors | null)` applies it on top of the theme
`setTheme` sets, and adds `vcv-root--flat`, whose rules remove the ocean,
the cards' and popovers' backdrop blur and shadows, the spheres' glow,
highlights and meniscus, and fill the liquid with one solid colour. `null`
goes back to the host's theme, including any `setTheme` made meanwhile.

## Web component

Package `@appswyldesolutions/vcv-web-component`. Importing its `./define`
entry registers `<value-chain-visualiser>`. The root entry registers nothing:
it exports the element class and `defineValueChainVisualiser()` for hosts that
register when they choose.

```html
<script type="module">
  import "@appswyldesolutions/vcv-web-component/define";
</script>
<value-chain-visualiser
  data-src="/data/bobos-big-block.json"
  data-period="July"
></value-chain-visualiser>
```

For React (with a typed wrapper, `@appswyldesolutions/vcv-react`), Next.js,
Vue and Angular, see `docs/frameworks.md`.

The element wraps `createVisual` in an open shadow root, so its styles and
the page's do not meet. Only the `@font-face` rules go in the page's head,
because browsers ignore them inside a shadow root.

| Attribute              | Meaning                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `data-src`             | URL of the KPI data as JSON. Fetched when the element is on the page, and again whenever the attribute changes. |
| `data-year`            | Year to show. Defaults to the data's latest year.                                                               |
| `data-period`          | Month to show (`"July"`). Defaults to the latest month with actuals.                                            |
| `data-fill-color`      | Sphere colour when a KPI is on target.                                                                          |
| `data-shortfall-color` | Sphere colour when a KPI misses its target.                                                                     |

- **Data shapes.** `data-src` may return `{ "records": [...] }` or a bare
  array of long rows (the Power BI / API shape, as in
  `fixtures/bobos-big-block.json`), or an array of the prototype's wide
  records (`fixtures/main-dc-prototype.json`).
- **Network.** `data-src` is the only network access in the project, and it
  lives in this package alone (CLAUDE.md rule 4). Core and the renderer make
  none. A host that already has the data sets the `rows` property to
  `KpiRow[]` instead, and nothing is fetched.
- **Stale replies.** If `data-src` changes, or `rows` is set, while a fetch is
  on its way, that fetch is aborted and its reply ignored.
- **Reconnecting.** Removing the element from the page tears the visual down.
  Putting it back redraws from the data already loaded, without fetching
  again.

| Event        | When                                        | `detail`                                                                                      |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `vcv-select` | A sphere is clicked                         | `{ node, group, subGroup, metric, year, period, actual, budget, hasData, met, level, label }` |
| `vcv-change` | The viewer changes Year, Period or a colour | `{ year, period, fillColor, shortfallColor }`                                                 |
| `vcv-error`  | `data-src` cannot be fetched or read        | The `Error`                                                                                   |

All three bubble and cross the shadow boundary (`composed`), so a listener on
the document hears them.

### Package

`npm install @appswyldesolutions/vcv-web-component` is the only install. The
build (tsup) bundles core and the renderer in, so the package has no runtime
dependencies.

| Entry       | Files                                                         | Registers the element |
| ----------- | ------------------------------------------------------------- | --------------------- |
| `.`         | `dist/index.js` (ESM), `dist/index.cjs` (CJS), `.d.ts/.d.cts` | No                    |
| `./define`  | `dist/define.js`, `dist/define.cjs`, `.d.ts/.d.cts`           | Yes                   |
| `./browser` | `dist/vcv.iife.js`, one minified file for a `<script>` tag    | Yes                   |

- **Tree-shaking.** `sideEffects` lists only `dist/define.js` and
  `dist/define.cjs`, so a bundler can drop whatever a host imports from `.`
  and does not use. `./define` imports the root entry rather than a copy of
  it, so both entries share one element class.
- **Script tag.** The IIFE build registers the element and puts the exports on
  `window.ValueChainVisualiser`:

  ```html
  <script src="https://unpkg.com/@appswyldesolutions/vcv-web-component/dist/vcv.iife.js"></script>
  <value-chain-visualiser data-src="/data.json"></value-chain-visualiser>
  ```

- **Fonts.** The renderer embeds its fonts, so their licences ship in
  `dist/licenses`.
- **Browsers only.** Loading any entry needs `HTMLElement`, so the package
  does not load in Node without a DOM such as jsdom.
