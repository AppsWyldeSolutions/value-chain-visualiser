import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The consumer apps must install the packed tarballs. As workspaces, npm
// would link them to packages/* source instead.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("apps/consumers", () => {
  it("are not npm workspaces", () => {
    const workspaces = JSON.parse(
      execSync("npm query .workspace", { cwd: root, encoding: "utf8" }),
    ) as { location: string }[];
    expect(workspaces.length).toBeGreaterThan(0);
    for (const { location } of workspaces) {
      expect(location.replace(/\\/g, "/")).not.toMatch(/^apps\/consumers\//);
    }
  }, 30_000);
});
