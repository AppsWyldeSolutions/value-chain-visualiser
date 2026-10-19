"use strict";

import type { KpiRow } from "@appswyldesolutions/vcv-core";
import {
  tooltipItems,
  type TooltipHandlers,
  type TooltipPoint,
  type TooltipTarget,
} from "@appswyldesolutions/vcv-renderer";
import type powerbi from "powerbi-visuals-api";
import { rowKey } from "./rows";

type ISelectionId = powerbi.visuals.ISelectionId;
type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type TooltipItem = powerbi.extensibility.VisualTooltipDataItem;

/** The data role whose fields a report adds to the tooltips. */
export const TOOLTIPS_ROLE = "tooltips";

/**
 * Tooltips through Power BI's tooltip service, so they take the report's
 * theme: a KPI's figures and status (or a card's link and on-target count),
 * then the fields in the Tooltips data role for that KPI's row. A KPI's
 * tooltip carries its row's selection id, so report page tooltips filter to
 * it.
 */
export class Tooltips {
  private readonly extras = new Map<string, TooltipItem[]>();
  private readonly numbers: Intl.NumberFormat;

  constructor(
    private readonly host: IVisualHost,
    private readonly element: HTMLElement,
    private readonly idFor: (row: KpiRow) => ISelectionId | undefined,
  ) {
    this.numbers = new Intl.NumberFormat(host.locale || undefined);
  }

  /** Reads the Tooltips fields; `rows` are the table's rows, in its order. */
  setTable(table: powerbi.DataViewTable | undefined, rows: KpiRow[]): void {
    this.extras.clear();
    const columns = (table?.columns ?? []).flatMap((column, index) =>
      column.roles?.[TOOLTIPS_ROLE]
        ? [{ name: column.displayName, index }]
        : [],
    );
    if (!table || columns.length === 0) return;
    rows.forEach((row, i) => {
      const values = table.rows?.[i] ?? [];
      this.extras.set(
        rowKey(row),
        columns.map(({ name, index }) => ({
          displayName: name,
          value: this.format(values[index]),
        })),
      );
    });
  }

  /** The renderer's tooltip handlers, drawing through the tooltip service. */
  handlers(): TooltipHandlers {
    return {
      show: (target, point) => {
        if (this.enabled()) {
          this.host.tooltipService.show(this.options(target, point));
        }
      },
      move: (target, point) => {
        if (this.enabled()) {
          this.host.tooltipService.move(this.options(target, point));
        }
      },
      hide: () => {
        if (this.enabled()) {
          this.host.tooltipService.hide({
            isTouchEvent: false,
            immediately: true,
          });
        }
      },
    };
  }

  private enabled(): boolean {
    return this.host.tooltipService?.enabled() ?? false;
  }

  private options(target: TooltipTarget, point: TooltipPoint) {
    // The service places the tooltip from the visual's own top-left corner.
    const corner = this.element.getBoundingClientRect();
    const row = target.kind === "kpi" ? target.kpi.row : undefined;
    const id = row ? this.idFor(row) : undefined;
    return {
      coordinates: [point.x - corner.left, point.y - corner.top],
      isTouchEvent: false,
      dataItems: [
        ...tooltipItems(target),
        ...(row ? (this.extras.get(rowKey(row)) ?? []) : []),
      ],
      identities: id ? [id] : [],
    };
  }

  private format(value: powerbi.PrimitiveValue | undefined): string {
    if (value === null || value === undefined) return "";
    return typeof value === "number"
      ? this.numbers.format(value)
      : String(value);
  }
}
