// The Configure dialog's page (config.html), which the extension opens with
// tableau.extensions.ui.displayDialogAsync. Tableau's API script has set
// window.tableau by the time this module runs.
import { startDialog } from "./dialog.js";

const root = document.querySelector("main");
if (root) {
  if (window.tableau) {
    void startDialog(window.tableau, root);
  } else {
    root.textContent = "Tableau's Extensions API did not load.";
  }
}
