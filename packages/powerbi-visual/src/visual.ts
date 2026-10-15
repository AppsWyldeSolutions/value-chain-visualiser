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

import { rowsFromTable } from "./rows";
import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
  private events: IVisualEventService;
  private vcv: VcvVisual;
  private formattingSettings: VisualFormattingSettingsModel;
  private formattingSettingsService: FormattingSettingsService;

  constructor(options: VisualConstructorOptions) {
    this.events = options.host.eventService;
    this.formattingSettingsService = new FormattingSettingsService();
    // The format pane can ask for the model before the first update.
    this.formattingSettings = new VisualFormattingSettingsModel();
    // Power BI owns the selection (filters) and colours (format pane), so
    // the visual draws no controls of its own.
    this.vcv = createVisual(options.element, { rows: [], showControls: false });
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
      const rows = rowsFromTable(dataView?.table);
      this.vcv.setRows(rows);
      this.vcv.setSelection(defaultSelection(rows));
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
