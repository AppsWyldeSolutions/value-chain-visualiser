// npm run e2e:consumers: packs the publishable packages, installs the
// tarballs into apps/consumers/* (which are not workspaces), builds the
// Next.js app and runs the consumer smoke tests.
//
// npm run e2e:consumers -- --registry: the same, but installs this
// checkout's versions from public npm instead, as a customer would after a
// release: a fresh cache and no user .npmrc, so no auth token.
import { execSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const registry = args.includes("--registry");
const playwrightArgs = args.filter((arg) => arg !== "--registry");
const source = registry ? "registry" : "tarball";
const run = (command, cwd = root) =>
  execSync(command, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      // A smoke test reports nothing to Next.js telemetry.
      NEXT_TELEMETRY_DISABLED: "1",
      // Tells the smoke tests where the packages should have come from.
      VCV_CONSUMERS_SOURCE: source,
    },
  });

let spec;
let installFlags = "";
if (registry) {
  const version = (dir) =>
    JSON.parse(
      readFileSync(path.join(root, "packages", dir, "package.json"), "utf8"),
    ).version;
  spec = (name) => `@appswyldesolutions/vcv-${name}@${version(name)}`;
  const scratch = mkdtempSync(path.join(tmpdir(), "vcv-registry-"));
  const npmrc = path.join(scratch, "npmrc");
  writeFileSync(npmrc, "");
  installFlags = [
    "--registry=https://registry.npmjs.org/",
    `--cache "${path.join(scratch, "cache")}"`,
    `--userconfig "${npmrc}"`,
  ].join(" ");
} else {
  const tarballs = path.join(root, ".consumers");
  rmSync(tarballs, { recursive: true, force: true, maxRetries: 10 });
  mkdirSync(tarballs);
  // prepack builds each package before it is packed.
  run(
    `npm pack -w packages/web-component -w packages/react --pack-destination "${tarballs}"`,
  );
  const packed = readdirSync(tarballs)
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => `"${path.join(tarballs, file)}"`);
  spec = (name) => {
    const file = packed.find((entry) => entry.includes(`-vcv-${name}-`));
    if (!file) throw new Error(`no tarball for vcv-${name} in ${tarballs}`);
    return file;
  };
}

// --no-package-lock: tarball hashes change on every pack, so the apps keep no
// lockfile. --no-save keeps the package specs out of their package.json. The
// previous run's vcv packages go first, so nothing is left over from it.
const install = (app, names) => {
  const dir = path.join(root, "apps/consumers", app);
  rmSync(path.join(dir, "node_modules/@appswyldesolutions"), {
    recursive: true,
    force: true,
    maxRetries: 10,
  });
  run(
    `npm install --no-package-lock --no-save --no-audit --no-fund ${installFlags} ${names.map(spec).join(" ")}`,
    dir,
  );
};
install("express", ["web-component"]);
install("next", ["react", "web-component"]);

run("npm run build", path.join(root, "apps/consumers/next"));
run(
  `npx playwright test -c playwright.consumers.config.ts ${playwrightArgs.join(" ")}`,
);
