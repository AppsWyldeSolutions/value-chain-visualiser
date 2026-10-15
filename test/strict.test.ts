import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Every package compiles with strict checks. The packages share
// tsconfig.base.json; the Power BI visual keeps pbiviz's own tsconfig.json
// (plain JSON, which pbiviz reads), so it states strict itself.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerOptions = (file: string) =>
  (
    JSON.parse(readFileSync(path.join(root, file), "utf8")) as {
      compilerOptions: { strict?: boolean };
    }
  ).compilerOptions;

describe("strict type checking", () => {
  it("is on for the packages sharing tsconfig.base.json", () => {
    expect(compilerOptions("tsconfig.base.json").strict).toBe(true);
  });

  it("is on for the whole Power BI visual, pbiviz's build included", () => {
    expect(
      compilerOptions("packages/powerbi-visual/tsconfig.json").strict,
    ).toBe(true);
  });
});
