import type { Theme } from "@appswyldesolutions/vcv-core";

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
    /**
     * How opaque the whole ocean is, base colour, rays, waves and bubbles
     * together, from "0" to "1". Below 1 the page behind shows through;
     * the cards are unaffected.
     */
    opacity: string;
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
    /** Opacity of a card with none of its KPIs selected. */
    dimOpacity: string;
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
    /** Widest a satellite KPI may be. */
    satelliteSlot: string;
    /** Narrowest it may be before the row wraps onto another line. */
    satelliteMinSlot: string;
    satelliteGap: string;
    satellitePercentSize: string;
    satelliteLabelSize: string;
    satelliteValueSize: string;
  };
  /** The arrows between cards. Lengths must be in px: they are measured. */
  connector: {
    stroke: string;
    strokeWidth: string;
    dash: string;
    head: string;
    headLength: string;
    headWidth: string;
    cornerRadius: string;
    /** Space between a card and the start of the arrow leaving it. */
    startGap: string;
    /** How far down a card the arrow to its right-hand neighbour sits. */
    rowAnchor: string;
    /** How far the hover and focus target extends either side of an arrow. */
    hitPadding: string;
  };
  /** The transfer points popover shown from an arrow. */
  popover: {
    width: string;
    padding: string;
    background: string;
    border: string;
    shadow: string;
    blur: string;
    /** Clear space between the arrow's target and the panel. */
    offset: string;
    /** Least distance kept from the edge of the viewport. Must be in px. */
    margin: string;
    titleSize: string;
    tagSize: string;
  };
  /** The Score Card that closes the chain, where it differs from a card. */
  score: {
    padding: string;
    gap: string;
    minHeight: string;
    /** Widest a primary KPI may be. */
    primarySlot: string;
    /** Narrowest it may be before the primary row wraps. */
    primaryMinSlot: string;
    primaryGap: string;
    /** Panels sit side by side while each can be at least this wide. */
    panelMinWidth: string;
    panelPadding: string;
    panelBackground: string;
    panelSphereSize: string;
    panelSlot: string;
    panelMinSlot: string;
    panelGap: string;
    panelPercentSize: string;
    panelLabelSize: string;
    panelValueSize: string;
  };
  /** The Year and Period selects and the colour pickers in the header. */
  control: {
    height: string;
    fontSize: string;
    labelSize: string;
    yearMinWidth: string;
    periodMinWidth: string;
    swatchWidth: string;
    /** A select's open list, which browsers draw on a light background. */
    optionColor: string;
    optionBackground: string;
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
    /** The most columns the grid will use, however wide it gets. */
    columns: string;
    /** A column is dropped once cards would be narrower than this. */
    cardMinWidth: string;
    columnGap: string;
    rowGap: string;
  };
  type: {
    eyebrowSize: string;
    titleSize: string;
    subtitleSize: string;
  };
  /** The notice under the header (Visual.setNotice). */
  notice: {
    color: string;
    background: string;
    border: string;
    borderWidth: string;
    size: string;
    padding: string;
  };
  motion: {
    bubbleDuration: string;
    bubbleRise: string;
    flowDuration: string;
    /** How long the compact detail popup and tooltips take to fade in. */
    popupDuration: string;
  };
  /**
   * The compact display's sizes. Those used inside a bar may use `cqw`: a
   * bar's slot is a size container, so they scale with the slot's width.
   */
  compact: {
    primarySphereSize: string;
    sphereSize: string;
    codeSize: string;
    primaryPctSize: string;
    pctSize: string;
    padding: string;
    radius: string;
    innerGap: string;
    rowGap: string;
    /** Between bars, in the chain's single row. */
    gap: string;
    borderWidth: string;
    detailWidth: string;
    closeSize: string;
    tipWidth: string;
    tipPadding: string;
    tipSize: string;
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
    opacity: "1",
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
    dimOpacity: "0.35",
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
    satelliteMinSlot: "70px",
    satelliteGap: "6px",
    satellitePercentSize: "16px",
    satelliteLabelSize: "12px",
    satelliteValueSize: "11.5px",
  },
  connector: {
    stroke: "rgba(255, 255, 255, 0.88)",
    strokeWidth: "2.5px",
    dash: "8 6",
    head: "rgba(255, 255, 255, 0.95)",
    headLength: "14px",
    headWidth: "16px",
    cornerRadius: "10px",
    startGap: "2px",
    rowAnchor: "187px",
    hitPadding: "16px",
  },
  popover: {
    width: "420px",
    padding: "18px",
    background:
      "linear-gradient(150deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)), rgba(6, 44, 78, 0.93)",
    border: "rgba(255, 255, 255, 0.28)",
    shadow:
      "0 30px 60px -12px rgba(0, 20, 45, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.26)",
    blur: "24px",
    offset: "8px",
    margin: "8px",
    titleSize: "18px",
    tagSize: "11px",
  },
  score: {
    padding: "24px",
    gap: "16px",
    minHeight: "640px",
    primarySlot: "300px",
    primaryMinSlot: "160px",
    primaryGap: "40px",
    panelMinWidth: "300px",
    panelPadding: "14px 12px",
    panelBackground: "rgba(255, 255, 255, 0.06)",
    panelSphereSize: "84px",
    panelSlot: "150px",
    panelMinSlot: "96px",
    panelGap: "4px",
    panelPercentSize: "18px",
    panelLabelSize: "13px",
    panelValueSize: "12px",
  },
  control: {
    height: "44px",
    fontSize: "15px",
    labelSize: "12px",
    yearMinWidth: "110px",
    periodMinWidth: "150px",
    swatchWidth: "64px",
    optionColor: "#0b3350",
    optionBackground: "#eaf6fb",
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
    cardMinWidth: "340px",
    columnGap: "56px",
    rowGap: "64px",
  },
  type: {
    eyebrowSize: "13px",
    titleSize: "38px",
    subtitleSize: "15px",
  },
  notice: {
    color: "#ffffff",
    background: "rgba(255, 255, 255, 0.14)",
    border: "rgba(255, 255, 255, 0.32)",
    borderWidth: "1px",
    size: "13px",
    padding: "6px 12px",
  },
  motion: {
    bubbleDuration: "16s",
    bubbleRise: "260px",
    flowDuration: "1.6s",
    popupDuration: "120ms",
  },
  compact: {
    primarySphereSize: "clamp(16px, 28cqw, 44px)",
    sphereSize: "clamp(9px, 11cqw, 18px)",
    codeSize: "clamp(7px, 6cqw, 11px)",
    primaryPctSize: "clamp(9px, 8cqw, 17px)",
    pctSize: "clamp(7px, 5.5cqw, 11px)",
    padding:
      "clamp(6px, 4cqw, 10px) clamp(5px, 3cqw, 8px) clamp(7px, 4.5cqw, 12px)",
    radius: "clamp(8px, 3cqw, 16px)",
    innerGap: "clamp(4px, 3cqw, 10px)",
    rowGap: "clamp(3px, 2cqw, 7px)",
    gap: "clamp(3px, 1vw, 14px)",
    borderWidth: "1px",
    detailWidth: "420px",
    closeSize: "26px",
    tipWidth: "240px",
    tipPadding: "7px 10px",
    tipSize: "12px",
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
    connector: mergeGroup(base.connector, overrides.connector),
    popover: mergeGroup(base.popover, overrides.popover),
    score: mergeGroup(base.score, overrides.score),
    control: mergeGroup(base.control, overrides.control),
    radii: mergeGroup(base.radii, overrides.radii),
    layout: mergeGroup(base.layout, overrides.layout),
    type: mergeGroup(base.type, overrides.type),
    notice: mergeGroup(base.notice, overrides.notice),
    motion: mergeGroup(base.motion, overrides.motion),
    compact: mergeGroup(base.compact, overrides.compact),
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
