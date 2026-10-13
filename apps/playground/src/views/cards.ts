import {
  buildModel,
  fromLongRows,
  type NodeModel,
} from "@AppsWyldeSolutions/vcv-core";
import { createCard, createShell } from "@AppsWyldeSolutions/vcv-renderer";
import fixture from "@fixtures/bobos-big-block.json";

const SELECTION = { year: 2026, period: "August" };

// The Score Card closes the chain and gets its own layout (issue #11). Like
// the prototype, it is recognised by its "... Scorecard" sub-groups.
function isScoreCard(node: NodeModel): boolean {
  return node.satellite.some((kpi) => /Scorecard$/.test(kpi.row.subGroup));
}

export function renderCards(app: HTMLElement): void {
  const { records } = fixture as { records: unknown[] };
  const model = buildModel(fromLongRows(records), SELECTION);
  const processes = model.nodes.filter((node) => !isScoreCard(node));

  const shell = createShell(app, {
    subtitle: `${SELECTION.period} ${SELECTION.year} · ${processes.length} process cards`,
  });
  for (const node of processes) {
    shell.grid.appendChild(createCard(document, node).element);
  }
}
