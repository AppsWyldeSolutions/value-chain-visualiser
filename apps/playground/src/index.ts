import { createShell } from "@AppsWyldeSolutions/vcv-renderer";

const app = document.getElementById("app");
if (app) {
  createShell(app, { subtitle: "No data loaded for this period" });
}
