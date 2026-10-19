import type { EvaluatedKpi, NodeModel } from "@appswyldesolutions/vcv-core";
import { onTargetText } from "./card.js";
import { shownKpis } from "./nodeKpis.js";

/** What the pointer is over: a KPI (its sphere, name or figures) or a card. */
export type TooltipTarget =
  { kind: "kpi"; kpi: EvaluatedKpi } | { kind: "card"; node: NodeModel };

/** The pointer, in viewport coordinates (clientX, clientY). */
export interface TooltipPoint {
  x: number;
  y: number;
}

/**
 * A host's own tooltips, in place of the native title tooltips: `show` when
 * the pointer reaches a target, `move` as it moves over the same one, `hide`
 * when it leaves every target.
 */
export interface TooltipHandlers {
  show(target: TooltipTarget, point: TooltipPoint): void;
  move(target: TooltipTarget, point: TooltipPoint): void;
  hide(): void;
}

export interface TooltipItem {
  displayName: string;
  value: string;
}

/** The lines of a target's tooltip, as name/value pairs. */
export function tooltipItems(target: TooltipTarget): TooltipItem[] {
  if (target.kind === "card") {
    return [
      { displayName: "Link", value: target.node.node },
      {
        displayName: "On target",
        value: onTargetText(shownKpis(target.node)).replace(/ on target$/, ""),
      },
    ];
  }
  const { kpi } = target;
  const { row } = kpi;
  const items = [
    { displayName: "KPI", value: row.metric },
    { displayName: "Period", value: `${row.period} ${row.year}` },
  ];
  if (!kpi.hasData) {
    return [
      ...items,
      { displayName: "Status", value: "No data for this period" },
    ];
  }
  const lessThan = row.operator === "LessThan";
  return [
    ...items,
    { displayName: "Actual", value: kpi.actual },
    { displayName: "Budget", value: kpi.budget },
    {
      displayName: "Rule",
      value: `Actual at or ${lessThan ? "under" : "above"} budget`,
    },
    {
      displayName: "Status",
      value: kpi.met ? "Target met" : lessThan ? "Over budget" : "Below budget",
    },
  ];
}
