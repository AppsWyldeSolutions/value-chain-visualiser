// node scripts/check-pack.mjs: builds every published package, packs it (a
// dry run) and fails if a tarball ships anything but its build, README,
// LICENSE and CHANGELOG.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RELEASE_ORDER, packFileProblems } from "./publishing.mjs";

const root = path.resolve(import.meta.dirname, "..");
const workspaces = RELEASE_ORDER.map((dir) => `-w packages/${dir}`).join(" ");
// prepack's build logs land on stdout too, so build first and pack with
// scripts off; stdout is then the JSON report alone.
for (const dir of RELEASE_ORDER) {
  execSync(`npm run build -w packages/${dir}`, { cwd: root, stdio: "inherit" });
}
const report = JSON.parse(
  execSync(`npm pack --dry-run --json --ignore-scripts ${workspaces}`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);

let failed = false;
for (const dir of RELEASE_ORDER) {
  const pkg = JSON.parse(
    readFileSync(path.join(root, "packages", dir, "package.json"), "utf8"),
  );
  const tarball = report.find((entry) => entry.name === pkg.name);
  if (!tarball) throw new Error(`npm pack reported nothing for ${pkg.name}`);
  const files = tarball.files.map((file) => file.path.replace(/\\/g, "/"));
  const problems = packFileProblems(files, pkg.files ?? []);
  for (const problem of problems) console.error(`${pkg.name} ${problem}`);
  if (problems.length > 0) failed = true;
  else console.log(`${pkg.name}@${pkg.version}: ${files.length} files, ok`);
}
if (failed) process.exit(1);
