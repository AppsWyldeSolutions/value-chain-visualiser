import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

// What npm consumers get from the tsup build.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = (file: string): string => path.join(root, "dist", file);
const read = (file: string): string => readFileSync(dist(file), "utf8");

interface PackageJson {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  sideEffects: boolean;
  exports: Record<string, unknown>;
}
const pkg = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
) as PackageJson;

const BUILT = ["index.js", "index.cjs", "index.d.ts", "index.d.cts"];

beforeAll(() => {
  execSync("npm run build", { cwd: root, stdio: "pipe" });
}, 180_000);

describe("the vcv-react package", () => {
  it.each(BUILT)("builds dist/%s", (file) => {
    expect(existsSync(dist(file))).toBe(true);
  });

  it.each(["index.js", "index.cjs"])(
    "keeps the use client directive first in %s",
    (file) => {
      expect(read(file)).toMatch(/^["']use client["'];/);
    },
  );

  it.each(["index.js", "index.cjs"])(
    "imports the web component and React rather than bundling them (%s)",
    (file) => {
      const code = read(file);
      expect(code).toContain("@appswyldesolutions/vcv-web-component/define");
      // The element's own code (shadow root, fetch) stays in its package.
      expect(code).not.toContain("attachShadow");
      expect(code).toMatch(/from "react"|require\("react"\)/);
    },
  );

  it("has React as a peer and the web component as a dependency", () => {
    expect(pkg.peerDependencies).toEqual({ react: ">=18" });
    expect(Object.keys(pkg.dependencies)).toEqual([
      "@appswyldesolutions/vcv-web-component",
    ]);
  });

  it("is side-effect free", () => {
    expect(pkg.sideEffects).toBe(false);
  });

  it("exports ESM, CJS and types", () => {
    expect(pkg.exports).toEqual({
      ".": {
        import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
        require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
      },
      "./package.json": "./package.json",
    });
  });

  it("re-exports the web component's types instead of redefining them", () => {
    const types = read("index.d.ts");
    expect(types).toMatch(
      /from ['"]@appswyldesolutions\/vcv-web-component['"]/,
    );
    expect(types).not.toMatch(/interface VcvSelectDetail/);
  });
});
