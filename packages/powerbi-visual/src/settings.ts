"use strict";

import { defaultTheme } from "@appswyldesolutions/vcv-renderer";
import type powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingSettingsSlice = formattingSettings.Slice;

// powerbi.visuals.ValidatorType is a const enum: a full TypeScript compile
// (pbiviz) inlines it, but the test runner does not, and the API package has
// no runtime value for it. Its two values used here, spelled out.
const MIN = 0 as powerbi.visuals.ValidatorType.Min;
const MAX = 1 as powerbi.visuals.ValidatorType.Max;

/** A slider's range, as the format pane shows and enforces it. */
const range = (min: number, max: number): powerbi.visuals.NumUpDownFormat => ({
  minValue: { type: MIN, value: min },
  maxValue: { type: MAX, value: max },
  unitSymbol: "%",
});

export const OPACITY = { min: 0, max: 100 };
export const SPHERE_SIZE = { min: 50, max: 150 };

/** The ocean presets the Background card offers, in the renderer's names. */
export const PRESETS: powerbi.IEnumMember[] = [
  { value: "ocean", displayName: "Ocean" },
  { value: "deep", displayName: "Deep" },
  { value: "lagoon", displayName: "Lagoon" },
  { value: "none", displayName: "None" },
];

/** On target and missed: the spheres' two liquid colours. */
class ColoursCard extends FormattingSettingsCard {
  fillColor = new formattingSettings.ColorPicker({
    name: "fillColor",
    displayName: "Fill colour",
    description: "Spheres for KPIs on target",
    value: { value: defaultTheme.fillColor },
  });

  shortfallColor = new formattingSettings.ColorPicker({
    name: "shortfallColor",
    displayName: "Shortfall colour",
    description: "Spheres for KPIs that missed their target",
    value: { value: defaultTheme.shortfallColor },
  });

  name = "colours";
  displayName = "Colours";
  slices: FormattingSettingsSlice[] = [this.fillColor, this.shortfallColor];
}

/** The ocean behind the cards. */
class BackgroundCard extends FormattingSettingsCard {
  preset = new formattingSettings.ItemDropdown({
    name: "preset",
    displayName: "Ocean",
    items: PRESETS,
    value: PRESETS[0]!,
  });

  opacity = new formattingSettings.Slider({
    name: "opacity",
    displayName: "Opacity",
    value: OPACITY.max,
    options: range(OPACITY.min, OPACITY.max),
  });

  name = "background";
  displayName = "Background";
  slices: FormattingSettingsSlice[] = [this.preset, this.opacity];
}

/** What the chain shows, and how large. */
class DisplayCard extends FormattingSettingsCard {
  showTransferPoints = new formattingSettings.ToggleSwitch({
    name: "showTransferPoints",
    displayName: "Transfer Points",
    description: "The Transfer Points shown from the arrows between cards",
    value: true,
  });

  sphereSize = new formattingSettings.Slider({
    name: "sphereSize",
    displayName: "Sphere size",
    value: 100,
    options: range(SPHERE_SIZE.min, SPHERE_SIZE.max),
  });

  name = "display";
  displayName = "Display";
  slices: FormattingSettingsSlice[] = [
    this.showTransferPoints,
    this.sphereSize,
  ];
}

/** The format pane: replaces the web component's header colour pickers. */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
  colours = new ColoursCard();
  background = new BackgroundCard();
  display = new DisplayCard();

  cards = [this.colours, this.background, this.display];
}
