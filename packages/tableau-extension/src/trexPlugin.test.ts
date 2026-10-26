import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_URL, EXTENSION_ID, HOSTED_URL } from "./manifest.js";
import { DEV_MANIFEST, MANIFEST, trexPlugin } from "./trexPlugin.js";

const packageDir = path.resolve(__dirname, "..");
const { version } = JSON.parse(
  readFileSync(path.join(packageDir, "package.json"), "utf8"),
) as { version: string };

type Hook = (this: unknown, ...args: unknown[]) => unknown;

/** Runs the plugin as Vite would for `command`, recording emitted files. */
function run(
  command: "build" | "serve",
  env: Record<string, string | undefined>,
  devDir: string,
) {
  const plugin = trexPlugin({ packageDir, devDir, env });
  const emitted: { fileName: string; source: string }[] = [];
  (plugin.configResolved as Hook)({ command });
  const context = {
    emitFile: vi.fn((file: { fileName: string; source: string }) => {
      emitted.push(file);
      return file.fileName;
    }),
  };
  (plugin.buildStart as Hook).call(context, {});
  return emitted;
}

let devDir: string;

beforeEach(() => {
  devDir = mkdtempSync(path.join(tmpdir(), "vcv-trex-"));
});

afterEach(() => {
  rmSync(devDir, { recursive: true, force: true });
});

describe("trexPlugin", () => {
  it("emits the hosted manifest beside the built page", () => {
    const [file, ...rest] = run(
      "build",
      { TABLEAU_EXTENSION_URL: "https://vcv.example.com/tableau/index.html" },
      devDir,
    );
    expect(rest).toEqual([]);
    expect(file?.fileName).toBe(MANIFEST);
    expect(file?.source).toContain(`id="${EXTENSION_ID}"`);
    expect(file?.source).toContain(`extension-version="${version}"`);
    expect(file?.source).toContain(
      "<url>https://vcv.example.com/tableau/index.html</url>",
    );
  });

  it("points the hosted manifest at GitHub Pages by default", () => {
    const [file] = run("build", {}, devDir);
    expect(file?.source).toContain(`<url>${HOSTED_URL}</url>`);
  });

  it("fails the build for a URL Tableau would not load", () => {
    expect(() =>
      run(
        "build",
        { TABLEAU_EXTENSION_URL: "http://vcv.example.com/" },
        devDir,
      ),
    ).toThrow(/TABLEAU_EXTENSION_URL.*https/);
  });

  it("writes the development manifest, for localhost, when serving", () => {
    expect(run("serve", {}, devDir)).toEqual([]);
    const xml = readFileSync(path.join(devDir, DEV_MANIFEST), "utf8");
    expect(xml).toContain(`id="${EXTENSION_ID}.dev"`);
    expect(xml).toContain(`<url>${DEV_URL}</url>`);
  });
});
