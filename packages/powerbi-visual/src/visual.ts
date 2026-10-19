"use strict";

import {
  createVisual,
  defaultSelection,
  type Visual as VcvVisual,
} from "@appswyldesolutions/vcv-renderer";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { rowsToShow, themeFrom } from "./format";
import { rowsFromTable } from "./rows";
import { RowSelection } from "./selection";
import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
  private events: IVisualEventService;
  private vcv: VcvVisual;
  private formattingSettings: VisualFormattingSettingsModel;
  private formattingSettingsService: FormattingSettingsService;
  private selection: RowSelection;

  // Optional because pbiviz's generated plugin (.tmp/precompile/visualPlugin.ts)
  // passes its own optional argument straight through; typed this way, that
  // file compiles under the package's strict settings.
  constructor(options?: VisualConstructorOptions) {
    if (!options) {
      throw new Error("Visual needs the constructor options Power BI passes");
    }
    this.events = options.host.eventService;
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
      const rows = rowsFromTable(dataView?.table);
      this.vcv.setRows(rowsToShow(rows, this.formattingSettings));
      this.vcv.setSelection(defaultSelection(rows));
      this.selection.setTable(dataView?.table, rows);
      this.events.renderingFinished(options);
    } catch (error) {
      this.events.renderingFailed(options, String(error));
    }
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
