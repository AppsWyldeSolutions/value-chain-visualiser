# packages/renderer spec

Vanilla DOM/SVG/CSS only. The renderer builds elements with `createElement`
and `textContent`, never `innerHTML`, and makes no network calls. The look
follows `docs/prototype/Main.dc.html`.

This file currently covers the shell (issue #6). Spheres, cards, connectors,
popovers and header controls are added by their own issues.

## Theme

`RendererTheme` extends core's `Theme` (`fillColor`, `shortfallColor`) with
every other colour, size and font the renderer uses. `defaultTheme` holds the
prototype's values.

| Group    | Tokens                                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (top)    | `fillColor`, `shortfallColor`                                                                                                                                                |
| `fonts`  | `body`, `display`                                                                                                                                                            |
| `colors` | `text`, `textSoft`, `textMuted`, `textLabel`, `focusRing`                                                                                                                    |
| `ocean`  | `base`, `gradient`, `rayColor`, `rayTop`, `rayAngle`, `rays[]`, `waveColor`, `waveHeight`, `waveOpacities[]`, `bubbleBorder`, `bubbleBorderWidth`, `bubbleFill`, `bubbles[]` |
| `glass`  | `cardBackground`, `cardBorder`, `cardShadow`, `blur`, `saturate`, `line`, `pillBackground`, `pillBorder`, `controlBackground`, `controlBorder`                               |
| `radii`  | `card`, `popover`, `panel`, `control`, `pill`                                                                                                                                |
| `layout` | `contentWidth`, `gutter`, `paddingTop`, `paddingBottom`, `headerHeight`, `headerGap`, `controlsGap`, `columns`, `columnGap`, `rowGap`                                        |
| `type`   | `eyebrowSize`, `titleSize`, `subtitleSize`                                                                                                                                   |
| `motion` | `bubbleDuration`, `bubbleRise`, `flowDuration`                                                                                                                               |

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
