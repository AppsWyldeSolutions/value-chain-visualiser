import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// npm refuses to publish a new package whose name has capital letters, and
// every package here is published under one scope.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packages = readdirSync(path.join(root, "packages")).map((dir) => {
  const file = path.join(root, "packages", dir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8")) as {
    name: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  return [dir, pkg] as const;
});

describe("published package names", () => {
  it.each(packages)("%s is named @appswyldesolutions/vcv-<dir>", (dir, pkg) => {
    expect(pkg.name).toBe(`@appswyldesolutions/vcv-${dir}`);
  });

  it.each(packages)(
    "%s depends on its siblings by the same scope",
    (_, pkg) => {
      const names = Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      });
      for (const name of names) {
        expect(name).toBe(name.toLowerCase());
      }
    },
  );
});
