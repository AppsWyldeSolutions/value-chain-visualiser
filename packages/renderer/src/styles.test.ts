import { describe, expect, it } from "vitest";
import { ELEMENT_CSS_VARS, stylesText } from "./styles.js";
import { defaultTheme, themeToCssVars } from "./theme.js";

describe("stylesText", () => {
  it("hard-codes no colours: they all come from the theme", () => {
    expect(stylesText).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(stylesText).not.toMatch(/\b(rgba?|hsla?)\(/i);
  });

  it("loads nothing external", () => {
    expect(stylesText).not.toMatch(/url\(/i);
    expect(stylesText).not.toMatch(/@import/i);
  });

  it("only references custom properties the theme or the shell provides", () => {
    const provided = new Set([
      ...Object.keys(themeToCssVars(defaultTheme)),
      ...ELEMENT_CSS_VARS,
    ]);
    const used = new Set(
      Array.from(stylesText.matchAll(/var\((--[a-z0-9-]+)/g), (m) => m[1]),
    );
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) {
      expect(provided, `${name} is not provided`).toContain(name);
    }
  });

  it("colours spheres from the theme's fill and shortfall colours", () => {
    const rule = (selector: string) =>
      stylesText.split(`\n${selector} {\n`)[1]?.split("\n}")[0];
    expect(rule(".vcv-sphere")).toContain(
      "--vcv-sphere-color: var(--vcv-fill-color);",
    );
    expect(rule(".vcv-sphere--missed")).toContain(
      "--vcv-sphere-color: var(--vcv-shortfall-color);",
    );
  });

  it("switches animations off under prefers-reduced-motion", () => {
    const block = stylesText.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    );
    expect(block?.[1]).toMatch(/\.vcv-ocean__bubble/);
    expect(block?.[1]).toMatch(/\.vcv-flow/);
    expect(block?.[1]).toMatch(/animation: none/);
  });
});
