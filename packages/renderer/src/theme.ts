import type { Theme } from "@AppsWyldeSolutions/vcv-core";

/** One light ray slanting down from the surface. */
export interface OceanRay {
  left: string;
  width: string;
  /** Usually a percentage of the shell's height, so rays scale with it. */
  height: string;
  opacity: number;
  blur: string;
}

/** One bubble drifting up the edge of the ocean. */
export interface OceanBubble {
  left: string;
  top: string;
  size: string;
  /** Negative delays start the bubble part-way through its rise. */
  delay: string;
}

/**
 * Every colour, size and font the renderer uses. Scalar tokens become
 * `--vcv-<group>-<token>` custom properties on the shell root; the list
 * tokens (`rays`, `waveOpacities`, `bubbles`) drive how many elements are built.
 */
export interface RendererTheme extends Theme {
  fonts: {
    body: string;
    display: string;
  };
  colors: {
    text: string;
    textSoft: string;
    textMuted: string;
    textLabel: string;
    focusRing: string;
  };
  ocean: {
    base: string;
    gradient: string;
    rayColor: string;
    rayTop: string;
    rayAngle: string;
    rays: OceanRay[];
    waveColor: string;
    waveHeight: string;
    waveOpacities: number[];
    bubbleBorder: string;
    bubbleBorderWidth: string;
    bubbleFill: string;
    bubbles: OceanBubble[];
  };
  glass: {
    cardBackground: string;
    cardBorder: string;
    cardShadow: string;
    blur: string;
    saturate: string;
    line: string;
    pillBackground: string;
    pillBorder: string;
    controlBackground: string;
    controlBorder: string;
  };
  sphere: {
    /** Default diameter; a sphere can be given its own. */
    size: string;
    /** The clear glass behind the liquid. */
    glass: string;
    shadow: string;
    ringWidth: string;
    ringOpacity: string;
    /** Ring of a sphere with no data. */
    emptyRing: string;
    /** Glow radius as a fraction of the diameter. */
    glowScale: string;
    glowOpacity: string;
    /** The colour the liquid and meniscus are lightened towards. */
    tint: string;
    /** How far the top of the liquid is lightened towards the tint. */
    liquidTint: string;
    liquidTopOpacity: string;
    liquidBottomOpacity: string;
    meniscusTint: string;
    meniscusOpacity: string;
    /** Meniscus height as a fraction of the diameter. */
    meniscusScale: string;
    highlight: string;
    highlightLow: string;
  };
  card: {
    padding: string;
    /** Space between the header and the rows, and between rows. */
    gap: string;
    minHeight: string;
    headerHeight: string;
    eyebrowSize: string;
    titleSize: string;
    pillSize: string;
    rowLabelSize: string;
    primarySphereSize: string;
    /** Widest a primary KPI may be; it shrinks when the row is full. */
    primarySlot: string;
    primaryPercentSize: string;
    primaryLabelSize: string;
    primaryValueSize: string;
    satelliteSphereSize: string;
    satelliteSlot: string;
    satelliteGap: string;
    satellitePercentSize: string;
    satelliteLabelSize: string;
    satelliteValueSize: string;
  };
  radii: {
    card: string;
    popover: string;
    panel: string;
    control: string;
    pill: string;
  };
  layout: {
    contentWidth: string;
    gutter: string;
    paddingTop: string;
    paddingBottom: string;
    headerHeight: string;
    headerGap: string;
    controlsGap: string;
    columns: string;
    columnGap: string;
    rowGap: string;
  };
  type: {
    eyebrowSize: string;
    titleSize: string;
    subtitleSize: string;
  };
  motion: {
    bubbleDuration: string;
    bubbleRise: string;
    flowDuration: string;
  };
}

/** A theme with any token left out; missing tokens fall back to the base. */
export type ThemeOverrides = {
  [K in keyof RendererTheme]?: RendererTheme[K] extends string
    ? RendererTheme[K]
    : Partial<RendererTheme[K]>;
};

/** The look of docs/prototype/Main.dc.html. */
export const defaultTheme: RendererTheme = {
  fillColor: "#8fd3f4",
  shortfallColor: "#ff9f40",
  fonts: {
    body: "'DM Sans', system-ui, sans-serif",
    display: "'Bricolage Grotesque', 'DM Sans', sans-serif",
  },
  colors: {
    text: "#ffffff",
    textSoft: "#f0f9fd",
    textMuted: "#d6ebf6",
    textLabel: "#cfe6f2",
    focusRing: "#ffffff",
  },
  ocean: {
    base: "#073a63",
    gradient:
      "linear-gradient(180deg, #0f6893 0%, #0c5f8c 12%, #0a4d78 40%, #073a63 70%, #052a4c 100%)",
    rayColor: "#beebff",
    rayTop: "-140px",
    rayAngle: "-13deg",
    rays: [
      {
        left: "6%",
        width: "200px",
        height: "52%",
        opacity: 0.09,
        blur: "16px",
      },
      {
        left: "22%",
        width: "120px",
        height: "42%",
        opacity: 0.07,
        blur: "14px",
      },
      {
        left: "41%",
        width: "260px",
        height: "59%",
        opacity: 0.08,
        blur: "18px",
      },
      {
        left: "63%",
        width: "150px",
        height: "45%",
        opacity: 0.07,
        blur: "14px",
      },
      {
        left: "82%",
        width: "220px",
        height: "56%",
        opacity: 0.08,
        blur: "18px",
      },
    ],
    waveColor: "#ffffff",
    waveHeight: "190px",
    waveOpacities: [0.06, 0.05, 0.04],
    bubbleBorder: "rgba(255, 255, 255, 0.5)",
    bubbleBorderWidth: "1.5px",
    bubbleFill: "rgba(255, 255, 255, 0.08)",
    bubbles: [
      { left: "4%", top: "73%", size: "12px", delay: "0s" },
      { left: "96%", top: "52%", size: "9px", delay: "-6s" },
      { left: "2%", top: "38%", size: "8px", delay: "-10s" },
      { left: "97%", top: "87%", size: "14px", delay: "-3s" },
      { left: "3%", top: "94%", size: "10px", delay: "-8s" },
      { left: "95%", top: "24%", size: "7px", delay: "-12s" },
    ],
  },
  glass: {
    cardBackground:
      "linear-gradient(150deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.05)), rgba(4, 38, 68, 0.25)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    cardShadow:
      "0 26px 50px -18px rgba(0, 25, 50, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.26)",
    blur: "22px",
    saturate: "1.15",
    line: "rgba(255, 255, 255, 0.18)",
    pillBackground: "rgba(255, 255, 255, 0.14)",
    pillBorder: "rgba(255, 255, 255, 0.24)",
    controlBackground: "rgba(255, 255, 255, 0.14)",
    controlBorder: "rgba(255, 255, 255, 0.32)",
  },
  sphere: {
    size: "72px",
    glass:
      "radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.03) 72%, rgba(255, 255, 255, 0.12))",
    shadow:
      "inset 0 -10px 18px rgba(0, 25, 55, 0.28), inset 0 5px 10px rgba(255, 255, 255, 0.16), 0 10px 22px rgba(0, 20, 45, 0.3)",
    ringWidth: "2px",
    ringOpacity: "92%",
    emptyRing: "rgba(255, 255, 255, 0.38)",
    glowScale: "0.3",
    glowOpacity: "28%",
    tint: "#ffffff",
    liquidTint: "35%",
    liquidTopOpacity: "80%",
    liquidBottomOpacity: "66%",
    meniscusTint: "55%",
    meniscusOpacity: "85%",
    meniscusScale: "0.1",
    highlight: "rgba(255, 255, 255, 0.62)",
    highlightLow: "rgba(255, 255, 255, 0.28)",
  },
  card: {
    padding: "20px",
    gap: "14px",
    minHeight: "608px",
    headerHeight: "64px",
    eyebrowSize: "12px",
    titleSize: "21px",
    pillSize: "12px",
    rowLabelSize: "12px",
    primarySphereSize: "132px",
    primarySlot: "382px",
    primaryPercentSize: "28px",
    primaryLabelSize: "15px",
    primaryValueSize: "13px",
    satelliteSphereSize: "72px",
    satelliteSlot: "90px",
    satelliteGap: "6px",
    satellitePercentSize: "16px",
    satelliteLabelSize: "12px",
    satelliteValueSize: "11.5px",
  },
  radii: {
    card: "24px",
    popover: "22px",
    panel: "18px",
    control: "12px",
    pill: "999px",
  },
  layout: {
    contentWidth: "1384px",
    gutter: "28px",
    paddingTop: "36px",
    paddingBottom: "48px",
    headerHeight: "100px",
    headerGap: "28px",
    controlsGap: "18px",
    columns: "3",
    columnGap: "56px",
    rowGap: "64px",
  },
  type: {
    eyebrowSize: "13px",
    titleSize: "38px",
    subtitleSize: "15px",
  },
  motion: {
    bubbleDuration: "16s",
    bubbleRise: "260px",
    flowDuration: "1.6s",
  },
};

function mergeGroup<T extends object>(base: T, overrides?: Partial<T>): T {
  const merged = { ...base };
  if (!overrides) return merged;
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const value = overrides[key];
    if (value !== undefined) merged[key] = value as T[keyof T];
  }
  return merged;
}

/** Lays `overrides` over `base`, one token group at a time. */
export function resolveTheme(
  overrides: ThemeOverrides = {},
  base: RendererTheme = defaultTheme,
): RendererTheme {
  return {
    fillColor: overrides.fillColor ?? base.fillColor,
    shortfallColor: overrides.shortfallColor ?? base.shortfallColor,
    fonts: mergeGroup(base.fonts, overrides.fonts),
    colors: mergeGroup(base.colors, overrides.colors),
    ocean: mergeGroup(base.ocean, overrides.ocean),
    glass: mergeGroup(base.glass, overrides.glass),
    sphere: mergeGroup(base.sphere, overrides.sphere),
    card: mergeGroup(base.card, overrides.card),
    radii: mergeGroup(base.radii, overrides.radii),
    layout: mergeGroup(base.layout, overrides.layout),
    type: mergeGroup(base.type, overrides.type),
    motion: mergeGroup(base.motion, overrides.motion),
  };
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Flattens the scalar tokens into CSS custom properties, e.g.
 * `colors.textMuted` -> `--vcv-colors-text-muted`. List tokens are skipped.
 */
export function themeToCssVars(theme: RendererTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value === "string") {
      vars[`--vcv-${kebab(key)}`] = value;
      continue;
    }
    for (const [token, tokenValue] of Object.entries(value)) {
      if (typeof tokenValue === "string") {
        vars[`--vcv-${kebab(key)}-${kebab(token)}`] = tokenValue;
      }
    }
  }
  return vars;
}

/** Sets the theme's custom properties on `element`. */
export function applyTheme(element: HTMLElement, theme: RendererTheme): void {
  for (const [name, value] of Object.entries(themeToCssVars(theme))) {
    element.style.setProperty(name, value);
  }
}
