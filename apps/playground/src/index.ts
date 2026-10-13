import { createShell } from "@AppsWyldeSolutions/vcv-renderer";
import { renderCards } from "./views/cards.js";
import { renderSpheres } from "./views/spheres.js";

// ?view=<name> picks what the playground shows; the default is the empty shell.
const VIEWS: Record<string, (app: HTMLElement) => void> = {
  shell: (app) => {
    createShell(app, { subtitle: "No data loaded for this period" });
  },
  spheres: renderSpheres,
  cards: renderCards,
};

const app = document.getElementById("app");
const view = new URLSearchParams(location.search).get("view") ?? "shell";
if (app) {
  (VIEWS[view] ?? VIEWS.shell)?.(app);
}
