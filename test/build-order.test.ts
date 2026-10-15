import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// npm runs `-w` workspaces in the order given, so the root build names them:
// the Power BI visual bundles core and the renderer from their built dist,
// so it builds after them.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = (
  JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }
).scripts.build!;
const order = [...build.matchAll(/-w (\S+)/g)].map((match) => match[1]);

describe("root build", () => {
  it("builds every workspace that has a build script", () => {
    const workspaces = JSON.parse(
      execSync("npm query .workspace", { cwd: root, encoding: "utf8" }),
    ) as { location: string; scripts?: Record<string, string> }[];
    const building = workspaces
      .filter((workspace) => workspace.scripts?.build)
      .map((workspace) => workspace.location.replace(/\\/g, "/"));
    expect([...order].sort()).toEqual(building.sort());
  }, 30_000);

  it("builds the Power BI visual after core and the renderer", () => {
    const at = (dir: string) => order.indexOf(`packages/${dir}`);
    expect(at("powerbi-visual")).toBeGreaterThan(at("core"));
    expect(at("powerbi-visual")).toBeGreaterThan(at("renderer"));
    expect(at("renderer")).toBeGreaterThan(at("core"));
  });
});
