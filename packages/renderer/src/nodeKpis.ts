import type { EvaluatedKpi, NodeModel } from "@appswyldesolutions/vcv-core";
import { isScoreCard, scoreCardKpis } from "./scoreCard.js";

/** The KPIs a node's card shows: the ones its pill and the subtitle count. */
export function shownKpis(node: NodeModel): EvaluatedKpi[] {
  return isScoreCard(node)
    ? scoreCardKpis(node)
    : [...node.primary, ...node.satellite];
}

/** Every KPI drawn for a node: on its card or in its transfer points. */
export function drawnKpis(node: NodeModel): EvaluatedKpi[] {
  return [...shownKpis(node), ...node.transferPoints];
}
