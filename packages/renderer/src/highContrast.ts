import { OCEAN_PRESETS } from "./oceanPresets.js";
import type { ThemeOverrides } from "./theme.js";

/**
 * The colours a high-contrast mode allows, as Power BI's colour palette
 * gives them (`foreground`, `background`, `foregroundSelected`, `hyperlink`).
 */
export interface HighContrastColors {
  foreground: string;
  background: string;
  /** Focus and selection. */
  foregroundSelected: string;
  /** A second colour that contrasts with the background: missed KPIs. */
  hyperlink: string;
}

/**
 * The flat theme for a high-contrast mode: every colour token in one of the
 * four colours, no gradients, glass, glow or shadows. Spheres on target fill
 * in the foreground colour and missed ones in the hyperlink colour. Pair it
 * with the flat style (`Visual.setHighContrast` does both), which removes
 * the ocean, the blur and the liquid's highlights.
 */
export function highContrastTheme(colors: HighContrastColors): ThemeOverrides {
  const { foreground: fg, background: bg } = colors;
  return {
    fillColor: fg,
    shortfallColor: colors.hyperlink,
    colors: {
      text: fg,
      textSoft: fg,
      textMuted: fg,
      textLabel: fg,
      focusRing: colors.foregroundSelected,
    },
    ocean: { ...OCEAN_PRESETS.none, base: bg, opacity: "1" },
    glass: {
      cardBackground: bg,
      cardBorder: fg,
      cardShadow: "none",
      blur: "0px",
      saturate: "100%",
      line: fg,
      pillBackground: bg,
      pillBorder: fg,
      controlBackground: bg,
      controlBorder: fg,
    },
    sphere: {
      glass: bg,
      shadow: "none",
      emptyRing: fg,
      ringOpacity: "100%",
      glowOpacity: "0%",
      tint: fg,
      liquidTint: "0%",
      liquidTopOpacity: "100%",
      liquidBottomOpacity: "100%",
      meniscusOpacity: "0%",
      highlight: "transparent",
      highlightLow: "transparent",
    },
    connector: { stroke: fg, head: fg },
    popover: { background: bg, border: fg, shadow: "none", blur: "0px" },
    score: { panelBackground: bg },
    control: { optionColor: fg, optionBackground: bg },
    notice: { color: fg, background: bg, border: fg },
  };
}
