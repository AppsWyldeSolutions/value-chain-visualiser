import {
  createCard,
  createConnectors,
  createScoreCard,
  createShell,
  isScoreCard,
} from "@AppsWyldeSolutions/vcv-renderer";
import { loadNodes, SELECTION } from "./processes.js";

function fixtureName(): string | undefined {
  return new URLSearchParams(location.search).get("fixture") ?? undefined;
}

// The Score Card on its own; ?fixture=<name> picks which fixture it is from.
export function renderScoreCard(app: HTMLElement): void {
  const shell = createShell(app, {
    subtitle: `${SELECTION.period} ${SELECTION.year} · Score Card`,
  });
  for (const node of loadNodes(fixtureName()).filter(isScoreCard)) {
    shell.grid.appendChild(createScoreCard(document, node).element);
  }
}

// The whole chain: every process card, then the Score Card, joined by arrows.
export function renderFull(app: HTMLElement): void {
  const nodes = loadNodes(fixtureName());
  const shell = createShell(app, {
    subtitle: `${SELECTION.period} ${SELECTION.year} · ${nodes.length} links in the chain`,
  });
  for (const node of nodes) {
    const card = isScoreCard(node)
      ? createScoreCard(document, node)
      : createCard(document, node);
    shell.grid.appendChild(card.element);
  }
  createConnectors(shell.grid);
}
