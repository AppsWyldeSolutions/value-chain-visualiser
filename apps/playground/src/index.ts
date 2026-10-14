import { createShell } from "@AppsWyldeSolutions/vcv-renderer";
import { renderFull, renderScoreCard } from "./views/scorecard.js";
import { renderElement } from "./views/element.js";
import { renderVisual } from "./views/visual.js";
import { renderChain } from "./views/chain.js";
import { renderCards } from "./views/cards.js";
import { renderSpheres } from "./views/spheres.js";

// ?view=<name> picks what the playground shows; the default is the empty shell.
const VIEWS: Record<string, (app: HTMLElement) => void> = {
  shell: (app) => {
    createShell(app, { subtitle: "No data loaded for this period" });
  },
  spheres: renderSpheres,
  cards: renderCards,
  chain: renderChain,
  scorecard: renderScoreCard,
  full: renderFull,
  visual: renderVisual,
  element: renderElement,
};

const app = document.getElementById("app");
const view = new URLSearchParams(location.search).get("view") ?? "shell";
if (app) {
  (VIEWS[view] ?? VIEWS.shell)?.(app);
}
