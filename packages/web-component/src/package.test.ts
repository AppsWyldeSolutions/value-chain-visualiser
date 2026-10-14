// @vitest-environment jsdom
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

// What npm consumers get: the tsup build and the packed tarball. jsdom gives
// the built element class an HTMLElement to extend when it loads.
// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
const root = path.resolve(__dirname, "..");
const dist = (file: string): string => path.join(root, "dist", file);

interface PackageJson {
  dependencies?: Record<string, string>;
  sideEffects: string[];
  exports: Record<string, unknown>;
}
const pkg = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
) as PackageJson;

const BUILT = [
  "index.js",
  "index.cjs",
  "index.d.ts",
  "index.d.cts",
  "define.js",
  "define.cjs",
  "define.d.ts",
  "define.d.cts",
  "vcv.iife.js",
];

beforeAll(() => {
  execSync("npm run build", { cwd: root, stdio: "pipe" });
}, 180_000);

describe("the npm package", () => {
  it.each(BUILT)("builds dist/%s", (file) => {
    expect(existsSync(dist(file))).toBe(true);
  });

  it("bundles the internal packages instead of importing them", () => {
    const outputs = readdirSync(dist("")).filter((file) =>
      /\.(c?js|d\.c?ts)$/.test(file),
    );
    expect(outputs.length).toBeGreaterThanOrEqual(BUILT.length);
    for (const file of outputs) {
      expect(readFileSync(dist(file), "utf8"), file).not.toMatch(
        /@AppsWyldeSolutions\/vcv-/,
      );
    }
  });

  it("has no runtime dependencies", () => {
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it("marks only the define outputs as having side effects", () => {
    expect(pkg.sideEffects).toEqual(["./dist/define.js", "./dist/define.cjs"]);
  });

  it("exports the root, define and browser entries", () => {
    expect(Object.keys(pkg.exports).sort()).toEqual([
      ".",
      "./browser",
      "./define",
      "./package.json",
    ]);
    expect(pkg.exports["./browser"]).toBe("./dist/vcv.iife.js");
    for (const [key, entry] of [
      [".", "index"],
      ["./define", "define"],
    ] as const) {
      expect(pkg.exports[key]).toEqual({
        import: {
          types: `./dist/${entry}.d.ts`,
          default: `./dist/${entry}.js`,
        },
        require: {
          types: `./dist/${entry}.d.cts`,
          default: `./dist/${entry}.cjs`,
        },
      });
    }
  });

  it("points every export at a built file", () => {
    const targets = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : Object.values(value as object).flatMap(targets);
    for (const target of targets(pkg.exports)) {
      expect(existsSync(path.join(root, target)), target).toBe(true);
    }
  });

  it("loads in Node through import and require", async () => {
    const esm = (await import(pathToFileURL(dist("index.js")).href)) as Record<
      string,
      unknown
    >;
    const cjs = createRequire(__filename)(dist("index.cjs")) as Record<
      string,
      unknown
    >;
    for (const mod of [esm, cjs]) {
      expect(mod.TAG_NAME).toBe("value-chain-visualiser");
      expect(mod.rowsFromJson).toBeTypeOf("function");
    }
  });

  it("shares one element class between the root and define entries", async () => {
    const load = async (file: string) =>
      (await import(pathToFileURL(dist(file)).href)) as Record<string, unknown>;
    const require = createRequire(__filename);
    expect((await load("define.js")).ValueChainVisualiserElement).toBe(
      (await load("index.js")).ValueChainVisualiserElement,
    );
    expect(
      (require(dist("define.cjs")) as Record<string, unknown>)
        .ValueChainVisualiserElement,
    ).toBe(
      (require(dist("index.cjs")) as Record<string, unknown>)
        .ValueChainVisualiserElement,
    );
  });

  it("packs only the build, the font licences and package metadata", () => {
    const [packed] = JSON.parse(
      execSync("npm pack --dry-run --json --ignore-scripts", {
        cwd: root,
        encoding: "utf8",
      }),
    ) as [{ files: { path: string }[] }];
    const files = packed.files.map((file) => file.path.replace(/\\/g, "/"));
    for (const file of files) {
      expect(file).toMatch(
        /^(package\.json|README\.md|dist\/((index|define)\.(js|cjs|d\.ts|d\.cts)|chunk-[\w-]+\.js|vcv\.iife\.js|licenses\/[\w.-]+\.txt))$/,
      );
    }
    expect(files).toEqual(
      expect.arrayContaining([
        ...BUILT.map((file) => `dist/${file}`),
        "dist/licenses/bricolage-grotesque-OFL.txt",
        "dist/licenses/dm-sans-OFL.txt",
      ]),
    );
  });
});
