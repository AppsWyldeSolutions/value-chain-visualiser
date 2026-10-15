// npm run release: publishes each package whose version is not on npm yet,
// in dependency order, then tags the release in git. Run it after
// `changeset version` has been merged, logged in with `npm login`.
//
// `npm run release -- --dry-run` goes through every step without publishing
// or tagging.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RELEASE_ORDER } from "./publishing.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const run = (command) => execSync(command, { cwd: root, stdio: "inherit" });

const published = (name, version) => {
  try {
    execSync(`npm view ${name}@${version} version`, {
      cwd: root,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
};

run("node scripts/check-pack.mjs");

for (const dir of RELEASE_ORDER) {
  const { name, version } = JSON.parse(
    readFileSync(path.join(root, "packages", dir, "package.json"), "utf8"),
  );
  if (published(name, version)) {
    console.log(`${name}@${version} is already on npm, skipping`);
    continue;
  }
  // Access comes from each package's publishConfig. npm asks for the
  // one-time password itself when the account has 2FA.
  run(`npm publish -w packages/${dir}${dryRun ? " --dry-run" : ""}`);
}

if (!dryRun) {
  run("npx changeset tag");
  console.log("Push the new tags with: git push --tags");
}
