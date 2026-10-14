import {
  createCard,
  createConnectors,
  createShell,
} from "@AppsWyldeSolutions/vcv-renderer";
import { loadProcesses, SELECTION } from "./processes.js";

// The process cards joined by their arrows; resize the window to see the
// grid drop columns and the arrows follow.
export function renderChain(app: HTMLElement): void {
  const processes = loadProcesses();
  const shell = createShell(app, {
    subtitle: `${SELECTION.period} ${SELECTION.year} · ${processes.length} processes in the chain`,
  });
  for (const node of processes) {
    shell.grid.appendChild(createCard(document, node).element);
  }
  createConnectors(shell.grid);
}
