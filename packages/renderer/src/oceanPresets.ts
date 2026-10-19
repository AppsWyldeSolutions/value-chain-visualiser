import { defaultTheme, type RendererTheme } from "./theme.js";

type Ocean = RendererTheme["ocean"];

/** The ocean colours a preset sets: string tokens only, so applying one
 * restyles a drawn visual in place, without rebuilding its rays or bubbles. */
export type OceanPreset = Pick<
  Ocean,
  "base" | "gradient" | "rayColor" | "waveColor" | "bubbleBorder" | "bubbleFill"
>;

const { base, gradient, rayColor, waveColor, bubbleBorder, bubbleFill } =
  defaultTheme.ocean;

/**
 * Background looks for `theme.ocean`. Each sets the same tokens, so applying
 * one fully replaces another. Pass as `{ ocean: OCEAN_PRESETS.deep }`.
 */
export const OCEAN_PRESETS = {
  /** The prototype's look, as in `defaultTheme`. */
  ocean: { base, gradient, rayColor, waveColor, bubbleBorder, bubbleFill },
  /** Darker and calmer: navy, with dimmer rays and bubbles. */
  deep: {
    base: "#03182c",
    gradient:
      "linear-gradient(180deg, #0a3d5c 0%, #08344f 12%, #062a44 40%, #041f36 70%, #03182c 100%)",
    rayColor: "#7fb8d6",
    waveColor: "#cfe8f5",
    bubbleBorder: "rgba(255, 255, 255, 0.35)",
    bubbleFill: "rgba(255, 255, 255, 0.05)",
  },
  /** Lighter: shallow teal water. */
  lagoon: {
    base: "#0a5469",
    gradient:
      "linear-gradient(180deg, #1f9fb3 0%, #1990a6 12%, #137a92 40%, #0e667d 70%, #0a5469 100%)",
    rayColor: "#e6fbff",
    waveColor: "#ffffff",
    bubbleBorder: "rgba(255, 255, 255, 0.6)",
    bubbleFill: "rgba(255, 255, 255, 0.1)",
  },
  /** No ocean: the page behind the visual shows through the glass cards. */
  none: {
    base: "transparent",
    gradient: "none",
    rayColor: "transparent",
    waveColor: "transparent",
    bubbleBorder: "transparent",
    bubbleFill: "transparent",
  },
} as const satisfies Record<string, OceanPreset>;

export type OceanPresetName = keyof typeof OCEAN_PRESETS;
