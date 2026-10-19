// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it } from "vitest";
import { highContrastTheme, type HighContrastColors } from "./highContrast.js";
import { stylesText } from "./styles.js";
import { defaultTheme, resolveTheme } from "./theme.js";
import { createVisual } from "./visual.js";

// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
const ROWS = fromLongRows(
  (
    JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../fixtures/bobos-big-block.json"),
        "utf8",
      ),
    ) as { records: unknown[] }
  ).records,
);

// Power BI's "High contrast #1" (Windows "Aquatic"-like) colours.
const COLORS: HighContrastColors = {
  foreground: "#ffff00",
  background: "#000000",
  foregroundSelected: "#00ffff",
  hyperlink: "#ff00ff",
};

/** Every token of a theme, as "group.token" = value. */
function tokens(theme: object): [string, string][] {
  return Object.entries(theme).flatMap(([group, value]) =>
    typeof value === "string"
      ? [[group, value] as [string, string]]
      : Object.entries(value as object)
          .filter(([, token]) => typeof token === "string")
          .map(([token, v]): [string, string] => [
            `${group}.${token}`,
            v as string,
          ]),
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("highContrastTheme", () => {
  const theme = resolveTheme(highContrastTheme(COLORS));
  const colourful = (value: string) => /#|rgb|hsl|gradient/i.test(value);

  it("draws in the palette's colours only: no other colour, no gradient", () => {
    const allowed = new Set(Object.values(COLORS));
    for (const [token, value] of tokens(theme)) {
      if (!colourful(value)) continue;
      expect(value, token).not.toMatch(/gradient|rgba?\(|hsla?\(/i);
      for (const colour of value.match(/#[0-9a-f]{3,8}/gi) ?? []) {
        expect(allowed.has(colour.toLowerCase()), `${token}: ${value}`).toBe(
          true,
        );
      }
    }
  });

  it("replaces every colour the default theme has", () => {
    for (const [token, value] of tokens(defaultTheme)) {
      if (!colourful(value)) continue;
      const contrast = tokens(theme).find(([name]) => name === token)?.[1];
      expect(contrast, token).not.toBe(value);
    }
  });

  it("fills spheres on target in the foreground, missed in the hyperlink colour", () => {
    expect(theme.fillColor).toBe(COLORS.foreground);
    expect(theme.shortfallColor).toBe(COLORS.hyperlink);
  });

  it("draws solid borders in the foreground colour", () => {
    expect(theme.glass.cardBorder).toBe(COLORS.foreground);
    expect(theme.popover.border).toBe(COLORS.foreground);
    expect(theme.connector.stroke).toBe(COLORS.foreground);
    expect(theme.sphere.ringOpacity).toBe("100%");
  });
});

describe("the flat style", () => {
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`${escaped}[^{]*\\{[^}]*\\}`).exec(stylesText)?.[0] ?? "";
  };

  it("removes the ocean, the glass and the liquid's highlights", () => {
    expect(rule(".vcv-root--flat .vcv-ocean")).toContain("display: none");
    expect(rule(".vcv-root--flat .vcv-sphere__highlight")).toContain(
      "display: none",
    );
    expect(rule(".vcv-root--flat .vcv-sphere__meniscus")).toContain(
      "display: none",
    );
    const glass = rule(".vcv-root--flat .vcv-card");
    expect(glass).toContain("backdrop-filter: none");
    expect(glass).toContain("box-shadow: none");
  });

  it("fills the liquid with one solid colour", () => {
    expect(rule(".vcv-root--flat .vcv-sphere__liquid")).toContain(
      "background: var(--vcv-sphere-color)",
    );
    expect(rule(".vcv-root--flat .vcv-sphere {")).toContain("box-shadow: none");
  });
});

describe("Visual.setHighContrast", () => {
  function mount() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return createVisual(container, { rows: ROWS });
  }
  const css = (root: HTMLElement, name: string) =>
    root.style.getPropertyValue(name);

  it("switches to the flat theme, and back", () => {
    const visual = mount();
    visual.setHighContrast(COLORS);
    expect(visual.root.classList.contains("vcv-root--flat")).toBe(true);
    expect(css(visual.root, "--vcv-fill-color")).toBe(COLORS.foreground);
    expect(css(visual.root, "--vcv-glass-card-background")).toBe(
      COLORS.background,
    );
    visual.setHighContrast(null);
    expect(visual.root.classList.contains("vcv-root--flat")).toBe(false);
    expect(css(visual.root, "--vcv-fill-color")).toBe(defaultTheme.fillColor);
  });

  it("keeps its colours over the host's theme, and the host's afterwards", () => {
    const visual = mount();
    visual.setHighContrast(COLORS);
    visual.setTheme({
      fillColor: "#2f9e44",
      card: { primarySphereSize: "99px" },
    });
    expect(css(visual.root, "--vcv-fill-color")).toBe(COLORS.foreground);
    expect(css(visual.root, "--vcv-card-primary-sphere-size")).toBe("99px");
    visual.setHighContrast(null);
    expect(css(visual.root, "--vcv-fill-color")).toBe("#2f9e44");
    expect(css(visual.root, "--vcv-card-primary-sphere-size")).toBe("99px");
  });
});
