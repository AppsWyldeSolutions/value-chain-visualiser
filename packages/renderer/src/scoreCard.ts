import type { EvaluatedKpi, NodeModel } from "@appswyldesolutions/vcv-core";
import { createFrame, createRow, primaryRowLabel, type Card } from "./card.js";

const SCORECARD = /Scorecard$/;

// A row's group is typed as one of three names, but the older data shape
// puts the scorecard's own name there ("Financial Scorecard").
function groupOf(kpi: EvaluatedKpi): string {
  return kpi.row.group;
}

function allKpis(node: NodeModel): EvaluatedKpi[] {
  return [...node.primary, ...node.satellite, ...node.transferPoints];
}

/**
 * The panel a KPI belongs to: the group itself in the older shape, otherwise
 * a satellite's sub-group. Anything else, including a satellite with no
 * sub-group, is in no panel.
 */
function panelOf(kpi: EvaluatedKpi): string {
  const group = groupOf(kpi);
  if (SCORECARD.test(group)) return group;
  if (group === "Satellite") return kpi.row.subGroup;
  return "";
}

/** Each panel's KPIs, keyed by name, in the order the names first appear. */
function panelsOf(node: NodeModel): Map<string, EvaluatedKpi[]> {
  const panels = new Map<string, EvaluatedKpi[]>();
  for (const kpi of [...node.satellite, ...node.transferPoints]) {
    const name = panelOf(kpi);
    if (!name) continue;
    const kpis = panels.get(name);
    if (kpis) kpis.push(kpi);
    else panels.set(name, [kpi]);
  }
  return panels;
}

/** The KPIs a Score Card shows: its primary KPIs, then each panel's. */
export function scoreCardKpis(node: NodeModel): EvaluatedKpi[] {
  return [...node.primary, ...Array.from(panelsOf(node).values()).flat()];
}

/**
 * Whether a node is the chain's Score Card rather than a process. As in the
 * prototype it is recognised by its data, not its name: some KPI's group or
 * sub-group ends in "Scorecard".
 */
export function isScoreCard(node: NodeModel): boolean {
  return allKpis(node).some(
    (kpi) => SCORECARD.test(groupOf(kpi)) || SCORECARD.test(kpi.row.subGroup),
  );
}

/**
 * Builds the Score Card that closes the chain: the primary KPIs in a row,
 * then one panel per scorecard sub-group. It has no satellite row; a
 * satellite outside every sub-group is not shown. It spans the grid's width.
 */
export function createScoreCard(doc: Document, node: NodeModel): Card {
  const panels = panelsOf(node);

  const { element, rows } = createFrame(doc, node, {
    modifier: "score",
    eyebrow: "Outcome",
    title: node.node,
    counted: scoreCardKpis(node),
  });

  if (node.primary.length > 0) {
    rows.appendChild(
      createRow(doc, primaryRowLabel(node.primary), node.primary, "primary"),
    );
  }
  if (panels.size > 0) {
    const container = doc.createElement("div");
    container.className = "vcv-card__panels";
    for (const [name, kpis] of panels) {
      container.appendChild(createRow(doc, name, kpis, "panel"));
    }
    rows.appendChild(container);
  }
  return { element };
}
