# packages/renderer spec

Vanilla DOM/SVG/CSS only. The renderer builds elements with `createElement`
and `textContent`, never `innerHTML`, and makes no network calls. The look
follows `docs/prototype/Main.dc.html`.

This file currently covers the shell (issue #6) and the sphere (issue #7).
Cards, connectors, popovers and header controls are added by their own
issues.

## Theme

`RendererTheme` extends core's `Theme` (`fillColor`, `shortfallColor`) with
every other colour, size and font the renderer uses. `defaultTheme` holds the
prototype's values.

| Group    | Tokens                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (top)    | `fillColor`, `shortfallColor`                                                                                                                                                                                                                    |
| `fonts`  | `body`, `display`                                                                                                                                                                                                                                |
| `colors` | `text`, `textSoft`, `textMuted`, `textLabel`, `focusRing`                                                                                                                                                                                        |
| `ocean`  | `base`, `gradient`, `rayColor`, `rayTop`, `rayAngle`, `rays[]`, `waveColor`, `waveHeight`, `waveOpacities[]`, `bubbleBorder`, `bubbleBorderWidth`, `bubbleFill`, `bubbles[]`                                                                     |
| `glass`  | `cardBackground`, `cardBorder`, `cardShadow`, `blur`, `saturate`, `line`, `pillBackground`, `pillBorder`, `controlBackground`, `controlBorder`                                                                                                   |
| `sphere` | `size`, `glass`, `shadow`, `ringWidth`, `ringOpacity`, `emptyRing`, `glowScale`, `glowOpacity`, `tint`, `liquidTint`, `liquidTopOpacity`, `liquidBottomOpacity`, `meniscusTint`, `meniscusOpacity`, `meniscusScale`, `highlight`, `highlightLow` |
| `radii`  | `card`, `popover`, `panel`, `control`, `pill`                                                                                                                                                                                                    |
| `layout` | `contentWidth`, `gutter`, `paddingTop`, `paddingBottom`, `headerHeight`, `headerGap`, `controlsGap`, `columns`, `columnGap`, `rowGap`                                                                                                            |
| `type`   | `eyebrowSize`, `titleSize`, `subtitleSize`                                                                                                                                                                                                       |
| `motion` | `bubbleDuration`, `bubbleRise`, `flowDuration`                                                                                                                                                                                                   |

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
