import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

/** Where scripts/consumers.mjs installed the packages from. */
export const SOURCE =
  process.env.VCV_CONSUMERS_SOURCE === "registry" ? "registry" : "tarball";

/**
 * Asserts the app installed each package the way a customer would: a real
 * folder in the app's own node_modules (not a symlink into packages/), with
 * only what npm pack ships (no src/), at this checkout's version, from the
 * packed tarball or, with --registry, from public npm.
 */
export function expectInstalledAsPublished(app: string, names: string[]): void {
  const appDir = path.resolve("apps/consumers", app);
  const lock = JSON.parse(
    readFileSync(path.join(appDir, "node_modules/.package-lock.json"), "utf8"),
  ) as { packages: Record<string, { resolved?: string }> };
  for (const name of names) {
    const dir = path.join(appDir, "node_modules", name);
    expect(existsSync(dir), `${name} installed in ${app}`).toBe(true);
    expect(lstatSync(dir).isSymbolicLink(), `${name} is a symlink`).toBe(false);
    expect(realpathSync(dir).startsWith(realpathSync(appDir))).toBe(true);
    expect(existsSync(path.join(dir, "src")), `${name} ships src/`).toBe(false);
    const pkg = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    ) as { name: string; version: string };
    expect(pkg.name).toBe(name);
    const workspace = JSON.parse(
      readFileSync(
        path.resolve(
          "packages",
          name.replace(/^@[^/]+\/vcv-/, ""),
          "package.json",
        ),
        "utf8",
      ),
    ) as { version: string };
    expect(pkg.version, `${name} version`).toBe(workspace.version);

    const resolved = lock.packages[`node_modules/${name}`]?.resolved ?? "";
    if (SOURCE === "registry") {
      expect(resolved).toMatch(/^https:\/\/registry\.npmjs\.org\//);
    } else {
      expect(resolved).toMatch(/^file:.*\.consumers\/.*\.tgz$/);
    }
  }
}
