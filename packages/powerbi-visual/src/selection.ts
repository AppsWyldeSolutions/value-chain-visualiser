"use strict";

import type { EvaluatedKpi, KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";

type ISelectionId = powerbi.visuals.ISelectionId;
type SelectedId = powerbi.extensibility.ISelectionId;
type ISelectionManager = powerbi.extensibility.ISelectionManager;
type IVisualHost = powerbi.extensibility.visual.IVisualHost;

/** Which KPIs to keep in full; null keeps every card. */
export type SelectedKpis = ((kpi: EvaluatedKpi) => boolean) | null;

/** One KPI in one period: what a table row, and a sphere, stand for. */
const keyOf = (row: KpiRow) =>
  [row.node, row.group, row.subGroup, row.metric, row.year, row.period].join(
    "\u0000",
  );

/**
 * Selection and cross-filtering: a selection id per table row, selected
 * through Power BI's selection manager when a sphere is clicked. `show` is
 * told which KPIs are selected whenever that changes, including when the host
 * changes it (bookmarks, or clearing it from another visual).
 */
export class RowSelection {
  private readonly manager: ISelectionManager;
  private readonly idOf = new Map<string, ISelectionId>();

  constructor(
    private readonly host: IVisualHost,
    private readonly show: (selected: SelectedKpis) => void,
  ) {
    this.manager = host.createSelectionManager();
    this.manager.registerOnSelectCallback((ids) => this.apply(ids));
  }

  /** Builds the ids for a new table; `rows` are its rows, in its order. */
  setTable(table: powerbi.DataViewTable | undefined, rows: KpiRow[]): void {
    this.idOf.clear();
    if (table) {
      rows.forEach((row, index) => {
        const id = this.host
          .createSelectionIdBuilder()
          .withTable(table, index)
          .createSelectionId();
        this.idOf.set(keyOf(row), id);
      });
    }
    this.apply(this.manager.getSelectionIds());
  }

  /** A sphere was clicked: select its row, or add it with `multi`. */
  async select(row: KpiRow, multi: boolean): Promise<void> {
    const id = this.idOf.get(keyOf(row));
    // A KPI with no row for the period is drawn as no data: nothing to select.
    if (!id) return;
    this.apply(await this.manager.select(id, multi));
  }

  /** A click away from every sphere. */
  async clear(): Promise<void> {
    await this.manager.clear();
    this.apply([]);
  }

  private apply(ids: SelectedId[]): void {
    const keys = new Set<string>();
    if (ids.length > 0) {
      for (const [key, id] of this.idOf) {
        if (ids.some((selected) => id.equals(selected as ISelectionId))) {
          keys.add(key);
        }
      }
    }
    this.show(keys.size > 0 ? (kpi) => keys.has(keyOf(kpi.row)) : null);
  }
}
