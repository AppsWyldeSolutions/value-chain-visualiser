import { describe, expect, it } from "vitest";
import { defaultTheme, resolveTheme, themeToCssVars } from "./theme.js";

describe("defaultTheme", () => {
  it("uses the prototype's fill and shortfall colours", () => {
    expect(defaultTheme.fillColor).toBe("#8fd3f4");
    expect(defaultTheme.shortfallColor).toBe("#ff9f40");
  });

  it("names only the bundled font families first", () => {
    expect(defaultTheme.fonts.body).toMatch(/^'DM Sans'/);
    expect(defaultTheme.fonts.display).toMatch(/^'Bricolage Grotesque'/);
  });
});

describe("resolveTheme", () => {
  it("returns the default theme when given no overrides", () => {
    expect(resolveTheme()).toEqual(defaultTheme);
  });

  it("merges overrides group by group without touching the defaults", () => {
    const theme = resolveTheme({
      fillColor: "#00ff00",
      radii: { card: "8px" },
    });
    expect(theme.fillColor).toBe("#00ff00");
    expect(theme.shortfallColor).toBe(defaultTheme.shortfallColor);
    expect(theme.radii.card).toBe("8px");
    expect(theme.radii.pill).toBe(defaultTheme.radii.pill);
    expect(defaultTheme.fillColor).toBe("#8fd3f4");
    expect(defaultTheme.radii.card).toBe("24px");
  });

  it("ignores undefined overrides", () => {
    const theme = resolveTheme({
      fillColor: undefined,
      ocean: { base: undefined },
    });
    expect(theme.fillColor).toBe(defaultTheme.fillColor);
    expect(theme.ocean.base).toBe(defaultTheme.ocean.base);
  });
});

describe("themeToCssVars", () => {
  const vars = themeToCssVars(defaultTheme);

  it("exposes top-level colours as --vcv-* custom properties", () => {
    expect(vars["--vcv-fill-color"]).toBe("#8fd3f4");
    expect(vars["--vcv-shortfall-color"]).toBe("#ff9f40");
  });

  it("prefixes grouped tokens with their group and kebab-cases the key", () => {
    expect(vars["--vcv-fonts-body"]).toBe(defaultTheme.fonts.body);
    expect(vars["--vcv-colors-text-muted"]).toBe(defaultTheme.colors.textMuted);
    expect(vars["--vcv-ocean-bubble-border-width"]).toBe(
      defaultTheme.ocean.bubbleBorderWidth,
    );
  });

  it("exposes the sphere tokens", () => {
    expect(vars["--vcv-sphere-size"]).toBe("72px");
    expect(vars["--vcv-sphere-ring-opacity"]).toBe("92%");
    expect(vars["--vcv-sphere-meniscus-scale"]).toBe("0.1");
  });

  it("emits only string values and leaves list tokens out", () => {
    for (const [name, value] of Object.entries(vars)) {
      expect(name).toMatch(/^--vcv-[a-z0-9-]+$/);
      expect(typeof value).toBe("string");
    }
    expect(Object.keys(vars).some((name) => /rays|bubbles/.test(name))).toBe(
      false,
    );
  });
});
