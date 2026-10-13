import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fontFaceCss } from "./fonts.generated.js";

describe("fontFaceCss", () => {
  it("declares the four faces the prototype uses", () => {
    const faces = Array.from(
      fontFaceCss.matchAll(
        /@font-face\{font-family:'([^']+)';font-style:normal;font-display:swap;font-weight:(\d+);/g,
      ),
      (m) => `${m[1]} ${m[2]}`,
    );
    expect(faces).toEqual([
      "DM Sans 400",
      "DM Sans 500",
      "DM Sans 700",
      "Bricolage Grotesque 700",
    ]);
  });

  it("embeds every font as a data URI, with no network sources", () => {
    const sources = Array.from(
      fontFaceCss.matchAll(/url\(([^)]{0,40})/g),
      (m) => m[1],
    );
    expect(sources).toHaveLength(4);
    for (const source of sources) {
      expect(source).toMatch(/^data:font\/woff2;base64,/);
    }
    expect(fontFaceCss).not.toMatch(/https?:/);
  });

  it("is in sync with scripts/embed-fonts.mjs", () => {
    const script = fileURLToPath(
      new URL("../../../scripts/embed-fonts.mjs", import.meta.url),
    );
    expect(() =>
      execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" }),
    ).not.toThrow();
  });
});
