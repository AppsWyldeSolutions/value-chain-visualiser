// npm run e2e:consumers: packs the publishable packages, installs the
// tarballs into apps/consumers/* (which are not workspaces), builds the
// Next.js app and runs the consumer smoke tests.
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tarballs = path.join(root, ".consumers");
const run = (command, cwd = root) =>
  execSync(command, {
    cwd,
    stdio: "inherit",
    // A smoke test reports nothing to Next.js telemetry.
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });

rmSync(tarballs, { recursive: true, force: true, maxRetries: 10 });
mkdirSync(tarballs);
// prepack builds each package before it is packed.
run(
  `npm pack -w packages/web-component -w packages/react --pack-destination "${tarballs}"`,
);
const packed = readdirSync(tarballs)
  .filter((file) => file.endsWith(".tgz"))
  .map((file) => `"${path.join(tarballs, file)}"`);
const tarball = (name) => {
  const file = packed.find((entry) => entry.includes(`-vcv-${name}-`));
  if (!file) throw new Error(`no tarball for vcv-${name} in ${tarballs}`);
  return file;
};

// --no-package-lock: tarball hashes change on every pack, so the apps keep no
// lockfile. --no-save keeps the tarball paths out of their package.json.
const install = (app, files) =>
  run(
    `npm install --no-package-lock --no-save --no-audit --no-fund ${files.join(" ")}`,
    path.join(root, "apps/consumers", app),
  );
install("express", [tarball("web-component")]);
install("next", [tarball("react"), tarball("web-component")]);

run("npm run build", path.join(root, "apps/consumers/next"));
run(
  `npx playwright test -c playwright.consumers.config.ts ${process.argv.slice(2).join(" ")}`,
);
