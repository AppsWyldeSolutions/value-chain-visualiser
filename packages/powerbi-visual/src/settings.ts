"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsModel = formattingSettings.Model;

/**
 * The format pane's model. No cards yet: the format pane settings (colours
 * and the like) come with their own issue.
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
  cards = [];
}
