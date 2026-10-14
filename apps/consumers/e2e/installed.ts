import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

/**
 * Asserts the app installed each package from its packed tarball: a real
 * folder in the app's own node_modules (not a symlink into packages/), with
 * only what npm pack ships (no src/).
 */
export function expectInstalledFromTarball(app: string, names: string[]): void {
  const appDir = path.resolve("apps/consumers", app);
  for (const name of names) {
    const dir = path.join(appDir, "node_modules", name);
    expect(existsSync(dir), `${name} installed in ${app}`).toBe(true);
    expect(lstatSync(dir).isSymbolicLink(), `${name} is a symlink`).toBe(false);
    expect(realpathSync(dir).startsWith(realpathSync(appDir))).toBe(true);
    expect(existsSync(path.join(dir, "src")), `${name} ships src/`).toBe(false);
    const pkg = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    ) as { name: string };
    expect(pkg.name).toBe(name);
  }
}
