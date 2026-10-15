// Runs after npm install (the root postinstall). pbiviz looks for
// powerbi-visuals-api in the visual's own node_modules, but npm workspaces
// hoist it to the root's, so pbiviz cannot find it and tries to reinstall it
// on every build. Link the hoisted copy into the visual's node_modules.
//
// A monorepo concern only: in a standalone repo of the visual, npm installs
// the package where pbiviz looks.
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const hoisted = path.join(root, "node_modules", "powerbi-visuals-api");
const visualModules = path.join(
  root,
  "packages",
  "powerbi-visual",
  "node_modules",
);
const link = path.join(visualModules, "powerbi-visuals-api");

if (existsSync(hoisted) && !existsSync(link)) {
  mkdirSync(visualModules, { recursive: true });
  // A junction on Windows needs no admin rights; "dir" elsewhere.
  symlinkSync(hoisted, link, process.platform === "win32" ? "junction" : "dir");
  console.log("linked powerbi-visuals-api into packages/powerbi-visual");
}
