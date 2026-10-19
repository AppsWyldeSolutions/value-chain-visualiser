// npm run build: packages the visual with Power BI's certification audit
// (pbiviz package --certification-audit) and fails unless it finds no
// external requests. The audit looks for fetch, XMLHttpRequest and eval in
// the bundle, which certification forbids; on its own it only logs them.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["pbiviz", "package", "--certification-audit"],
  {
    encoding: "utf8",
    // npx is npx.cmd on Windows.
    shell: process.platform === "win32",
  },
);
if (result.error) {
  console.error(`Could not run pbiviz: ${result.error.message}`);
  process.exit(1);
}
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status !== 0) process.exit(result.status ?? 1);
const output = `${result.stdout}${result.stderr}`;
if (!output.includes("No external requests found in the visual.")) {
  console.error(
    "Certification audit failed: the bundle makes external requests (see above).",
  );
  process.exit(1);
}
