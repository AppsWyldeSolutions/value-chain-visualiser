import { createCard, createShell } from "@AppsWyldeSolutions/vcv-renderer";
import { loadProcesses, SELECTION } from "./processes.js";

export function renderCards(app: HTMLElement): void {
  const processes = loadProcesses();
  const shell = createShell(app, {
    subtitle: `${SELECTION.period} ${SELECTION.year} · ${processes.length} process cards`,
  });
  for (const node of processes) {
    shell.grid.appendChild(createCard(document, node).element);
  }
}
