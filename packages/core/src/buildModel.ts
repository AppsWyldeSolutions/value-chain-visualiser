import { evaluate, formatValues } from "./evaluate.js";
import type {
  EvaluatedKpi,
  KpiRow,
  NodeModel,
  ValueChainVisualiserModel,
} from "./types.js";

function toEvaluatedKpi(row: KpiRow): EvaluatedKpi {
  return { row, ...evaluate(row), ...formatValues(row) };
}

export function buildModel(
  rows: KpiRow[],
  sel: { year: number; period: string },
): ValueChainVisualiserModel {
  const selected = rows.filter(
    (r) => r.year === sel.year && r.period === sel.period,
  );

  const nodes = new Map<string, NodeModel>();
  for (const row of selected) {
    let node = nodes.get(row.node);
    if (!node) {
      node = {
        node: row.node,
        nodeOrder: row.nodeOrder,
        primary: [],
        satellite: [],
        transferPoints: [],
      };
      nodes.set(row.node, node);
    }
    const kpi = toEvaluatedKpi(row);
    if (row.group === "Primary") node.primary.push(kpi);
    else if (row.group === "Satellite") node.satellite.push(kpi);
    else node.transferPoints.push(kpi);
  }

  return {
    year: sel.year,
    period: sel.period,
    nodes: Array.from(nodes.values()).sort((a, b) => a.nodeOrder - b.nodeOrder),
  };
}
