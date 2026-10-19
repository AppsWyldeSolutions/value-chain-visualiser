"use strict";

import {
  createVisual,
  defaultSelection,
  type HighContrastColors,
  type Visual as VcvVisual,
} from "@appswyldesolutions/vcv-renderer";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { headerFrom, rowsToShow, themeFrom } from "./format";
import { periodNotice } from "./periods";
import { emptyMessage, missingRoles, rowsFromTable } from "./rows";
import { RowSelection } from "./selection";
import { VisualFormattingSettingsModel } from "./settings";
import { Tooltips } from "./tooltips";

type ColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;

export class Visual implements IVisual {
  private events: IVisualEventService;
  private vcv: VcvVisual;
  private formattingSettings: VisualFormattingSettingsModel;
  private formattingSettingsService: FormattingSettingsService;
  private selection: RowSelection;
  private tooltips: Tooltips;
  private host: powerbi.extensibility.visual.IVisualHost;

  // Optional because pbiviz's generated plugin (.tmp/precompile/visualPlugin.ts)
  // passes its own optional argument straight through; typed this way, that
  // file compiles under the package's strict settings.
  constructor(options?: VisualConstructorOptions) {
    if (!options) {
      throw new Error("Visual needs the constructor options Power BI passes");
    }
    this.host = options.host;
    this.events = options.host.eventService;
    this.tooltips = new Tooltips(options.host, options.element, (row) =>
      this.selection.idFor(row),
    );
    this.formattingSettingsService = new FormattingSettingsService();
    // The format pane can ask for the model before the first update.
    this.formattingSettings = new VisualFormattingSettingsModel();
    // Power BI owns the selection (filters) and colours (format pane), so
    // the visual draws no controls of its own.
    this.vcv = createVisual(options.element, {
      rows: [],
      showControls: false,
      theme: themeFrom(this.formattingSettings),
      // Selection and cross-filtering: a sphere selects its table row.
      onSelect: (kpi, { multi }) => void this.selection.select(kpi.row, multi),
      onDeselect: () => void this.selection.clear(),
      // Power BI's tooltips, in the report's theme, not the native ones.
      tooltip: this.tooltips.handlers(),
    });
    this.selection = new RowSelection(options.host, (selected) =>
      this.vcv.setSelectedKpis(selected),
    );
  }

  public update(options: VisualUpdateOptions) {
    this.events.renderingStarted(options);
    try {
      const dataView = options.dataViews?.[0];
      this.formattingSettings =
        this.formattingSettingsService.populateFormattingSettingsModel(
          VisualFormattingSettingsModel,
          dataView,
        );
      // Every update carries the format pane's settings, so a change there
      // restyles the drawn visual in place.
      this.vcv.setTheme(themeFrom(this.formattingSettings));
      this.vcv.setHighContrast(highContrastColors(this.host.colorPalette));
      this.vcv.setHeader(headerFrom(this.formattingSettings));
      const rows = rowsFromTable(dataView?.table);
      // Until every required field is in its well, say which to add rather
      // than draw an empty chain.
      const missing = missingRoles(dataView?.table);
      this.vcv.setEmpty(missing.length > 0 ? emptyMessage(missing) : null);
      this.vcv.setRows(rowsToShow(rows, this.formattingSettings));
      this.vcv.setSelection(defaultSelection(rows));
      // With several periods in the rows, say which one is shown.
      this.vcv.setNotice(periodNotice(rows));
      this.selection.setTable(dataView?.table, rows);
      this.tooltips.setTable(dataView?.table, rows);
    } catch (error) {
      this.events.renderingFailed(options, String(error));
      return;
    }
    // Outside the try, so each update ends in exactly one of the two events.
    this.events.renderingFinished(options);
  }

  public destroy(): void {
    this.vcv.destroy();
  }

  /**
   * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
   * This method is called once every time we open properties pane or when the user edit any format property.
   */
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(
      this.formattingSettings,
    );
  }
}

/**
 * The palette's colours while Power BI's high-contrast mode is on (the
 * visual then draws flat, in these only); null otherwise.
 */
function highContrastColors(
  palette: powerbi.extensibility.IColorPalette | undefined,
): HighContrastColors | null {
  const colors = palette as ColorPalette | undefined;
  if (!colors?.isHighContrast) return null;
  return {
    foreground: colors.foreground.value,
    background: colors.background.value,
    foregroundSelected: colors.foregroundSelected.value,
    hyperlink: colors.hyperlink.value,
  };
}
