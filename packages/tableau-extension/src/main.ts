// The page Tableau loads (index.html). Tableau's API script has set
// window.tableau by the time this module runs: classic scripts run before
// module scripts.
import "@appswyldesolutions/vcv-web-component/define";
import { startExtension } from "./extension.js";

const visual = document.querySelector("value-chain-visualiser");
const status = document.getElementById("status");
if (visual && status) {
  if (window.tableau) {
    void startExtension(window.tableau, { visual, status });
  } else {
    status.textContent = "Tableau's Extensions API did not load.";
    status.hidden = false;
  }
}
