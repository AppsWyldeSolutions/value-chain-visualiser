import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RELEASE_ORDER, packFileProblems } from "../scripts/publishing.mjs";

// Every packages/* package goes to public npm: anyone can install it with no
// auth token, and npm shows where its source and issues live.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/AppsWyldeSolutions/value-chain-visualiser";

type Manifest = {
  name: string;
  version: string;
  private?: boolean;
  license?: string;
  author?: string;
  files?: string[];
  publishConfig?: { access?: string };
  repository?: { type?: string; url?: string; directory?: string };
  homepage?: string;
  bugs?: { url?: string };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

// Siblings depend on each other by caret ranges: same major, at least the
// range's version.
function caretSatisfies(version: string, range: string): boolean {
  const want = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range)?.slice(1).map(Number);
  const have = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)?.slice(1).map(Number);
  if (!want || !have || have[0] !== want[0]) return false;
  for (let i = 1; i < 3; i++) {
    if (have[i] !== want[i]) return have[i]! > want[i]!;
  }
  return true;
}

const dirs = readdirSync(path.join(root, "packages"));
const manifests = new Map(
  dirs.map((dir) => {
    const file = path.join(root, "packages", dir, "package.json");
    return [dir, JSON.parse(readFileSync(file, "utf8")) as Manifest] as const;
  }),
);
// The Power BI visual ships as a .pbiviz file, never to npm.
const PRIVATE = ["powerbi-visual"];
const packages = [...manifests].filter(([dir]) => !PRIVATE.includes(dir));
const dirOf = new Map([...manifests].map(([dir, pkg]) => [pkg.name, dir]));

describe("private packages", () => {
  it.each(PRIVATE)("%s is private, so npm never publishes it", (dir) => {
    expect(manifests.get(dir)?.private).toBe(true);
  });
});

describe("publishable packages", () => {
  it("are released in an order that lists each package once", () => {
    expect([...RELEASE_ORDER].sort()).toEqual(
      packages.map(([dir]) => dir).sort(),
    );
  });

  it.each(packages)("%s publishes publicly", (_, pkg) => {
    expect(pkg.private).not.toBe(true);
    expect(pkg.publishConfig?.access).toBe("public");
  });

  it.each(packages)("%s is MIT licensed, like the repo", (dir, pkg) => {
    expect(pkg.license).toBe("MIT");
    const license = path.join(root, "packages", dir, "LICENSE");
    expect(existsSync(license), `packages/${dir}/LICENSE`).toBe(true);
    expect(readFileSync(license, "utf8")).toBe(
      readFileSync(path.join(root, "LICENSE"), "utf8"),
    );
  });

  it.each(packages)("%s names its author", (_, pkg) => {
    expect(pkg.author).toBe("Wylde Solutions Pty Ltd");
  });

  it.each(packages)("%s links to its source and issues", (dir, pkg) => {
    expect(pkg.repository).toEqual({
      type: "git",
      url: `git+${REPO}.git`,
      directory: `packages/${dir}`,
    });
    expect(pkg.homepage).toBe(`${REPO}/tree/main/packages/${dir}#readme`);
    expect(pkg.bugs).toEqual({ url: `${REPO}/issues` });
  });

  it.each(packages)("%s ships an allowlist and a README", (dir, pkg) => {
    expect(pkg.files?.length).toBeGreaterThan(0);
    expect(existsSync(path.join(root, "packages", dir, "README.md"))).toBe(
      true,
    );
  });

  it.each(packages)("%s builds itself when packed", (_, pkg) => {
    expect(pkg.scripts?.prepack).toBe("npm run build");
    expect(pkg.scripts?.build).toBeTruthy();
    // npm's "no test specified" stub fails `npm test -ws`.
    expect(pkg.scripts?.test).toBeUndefined();
  });

  it.each(packages)(
    "%s depends only on siblings released before it, at their versions",
    (dir, pkg) => {
      const ranges = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      for (const [name, range] of Object.entries(ranges)) {
        const sibling = dirOf.get(name);
        if (!sibling) {
          expect(name, `${name} is not a vcv package`).not.toMatch(
            /^@appswyldesolutions\//,
          );
          continue;
        }
        const version = manifests.get(sibling)!.version;
        expect(caretSatisfies(version, range), `${name}@${range}`).toBe(true);
        expect(RELEASE_ORDER.indexOf(sibling)).toBeLessThan(
          RELEASE_ORDER.indexOf(dir),
        );
      }
    },
  );
});

describe("packFileProblems", () => {
  const clean = [
    "package.json",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "dist/index.js",
    "dist/index.d.ts",
  ];

  it("accepts dist, README, LICENSE and CHANGELOG", () => {
    expect(packFileProblems(clean, ["dist"])).toEqual([]);
  });

  it("accepts any folder in the package's files list", () => {
    const files = [...clean, "licenses/dm-sans-OFL.txt"];
    expect(packFileProblems(files, ["dist", "licenses"])).toEqual([]);
    expect(packFileProblems(files, ["dist"])).toEqual([
      "ships licenses/dm-sans-OFL.txt",
    ]);
  });

  it("rejects source, config and compiled tests", () => {
    const files = [
      ...clean,
      "src/index.ts",
      "tsconfig.json",
      "dist/evaluate.test.js",
      "dist/evaluate.test.d.ts",
      "dist/testHelpers.js",
    ];
    expect(packFileProblems(files, ["dist"])).toEqual([
      "ships src/index.ts",
      "ships tsconfig.json",
      "ships dist/evaluate.test.js",
      "ships dist/evaluate.test.d.ts",
      "ships dist/testHelpers.js",
    ]);
  });

  it("requires README, LICENSE and a build", () => {
    expect(packFileProblems(["package.json"], ["dist"])).toEqual([
      "is missing README.md",
      "is missing LICENSE",
      "is missing dist/",
    ]);
  });
});
