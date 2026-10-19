"use strict";

import type { KpiRow } from "@appswyldesolutions/vcv-core";
import {
  defaultTheme,
  OCEAN_PRESETS,
  type OceanPresetName,
  type HeaderOptions,
  type ThemeOverrides,
} from "@appswyldesolutions/vcv-renderer";
import {
  OPACITY,
  SPHERE_SIZE,
  type VisualFormattingSettingsModel,
} from "./settings";

const clamp = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, value));

/** A px length from the default theme, scaled. */
const scaled = (length: string, scale: number) =>
  `${Math.round(parseFloat(length) * scale)}px`;

/**
 * The renderer theme for the format pane's settings. It sets every token the
 * pane controls, so a setting reset to its default resets the visual too.
 */
export function themeFrom(
  settings: VisualFormattingSettingsModel,
): ThemeOverrides {
  const { colours, background, display } = settings;
  const preset = (background.preset.value?.value ?? "ocean") as OceanPresetName;
  const opacity = clamp(background.opacity.value, OPACITY) / 100;
  const scale = clamp(display.sphereSize.value, SPHERE_SIZE) / 100;
  const { card, score } = defaultTheme;
  return {
    fillColor: colours.fillColor.value.value,
    shortfallColor: colours.shortfallColor.value.value,
    ocean: {
      ...(OCEAN_PRESETS[preset] ?? OCEAN_PRESETS.ocean),
      opacity: String(opacity),
    },
    // The slots grow with the spheres so a larger sphere does not overflow
    // its KPI; the primary slot is already wide enough.
    card: {
      primarySphereSize: scaled(card.primarySphereSize, scale),
      satelliteSphereSize: scaled(card.satelliteSphereSize, scale),
      satelliteSlot: scaled(card.satelliteSlot, scale),
      satelliteMinSlot: scaled(card.satelliteMinSlot, scale),
    },
    score: {
      panelSphereSize: scaled(score.panelSphereSize, scale),
      panelSlot: scaled(score.panelSlot, scale),
      panelMinSlot: scaled(score.panelMinSlot, scale),
    },
  };
}

/** The header for the format pane's Header card. */
export function headerFrom(
  settings: VisualFormattingSettingsModel,
): HeaderOptions {
  const { header } = settings;
  return {
    eyebrow: header.eyebrow.value,
    title: header.title.value,
    show: header.showHeader.value,
    showSubtitle: header.showSubtitle.value,
  };
}

/** The rows to draw: without the Transfer Points when they are hidden. */
export function rowsToShow(
  rows: KpiRow[],
  settings: VisualFormattingSettingsModel,
): KpiRow[] {
  return settings.display.showTransferPoints.value
    ? rows
    : rows.filter((row) => row.group !== "Transfer Points");
}
