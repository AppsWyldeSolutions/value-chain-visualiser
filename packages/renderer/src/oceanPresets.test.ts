// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { OCEAN_PRESETS } from "./oceanPresets.js";
import { createShell } from "./shell.js";
import { stylesText } from "./styles.js";
import { defaultTheme, themeToCssVars } from "./theme.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("ocean.opacity", () => {
  it("defaults to fully opaque and becomes a custom property", () => {
    expect(defaultTheme.ocean.opacity).toBe("1");
    expect(themeToCssVars(defaultTheme)["--vcv-ocean-opacity"]).toBe("1");
  });

  it("fades the whole ocean layer, base colour included, not the cards", () => {
    const ocean = /\.vcv-ocean \{[^}]*\}/.exec(stylesText)?.[0] ?? "";
    expect(ocean).toContain("opacity: var(--vcv-ocean-opacity)");
    expect(ocean).toContain("var(--vcv-ocean-base)");
    // The root itself stays clear, so the faded ocean shows the page behind.
    const root = /\.vcv-root \{[^}]*\}/.exec(stylesText)?.[0] ?? "";
    expect(root).not.toContain("var(--vcv-ocean-base)");
  });
});

describe("OCEAN_PRESETS", () => {
  const names = Object.keys(OCEAN_PRESETS);

  it("offers Ocean, Deep, Lagoon and None", () => {
    expect(names).toEqual(["ocean", "deep", "lagoon", "none"]);
  });

  it("makes Ocean today's look", () => {
    for (const [token, value] of Object.entries(OCEAN_PRESETS.ocean)) {
      expect(value, token).toBe(
        defaultTheme.ocean[token as keyof typeof defaultTheme.ocean],
      );
    }
  });

  it("sets the same colour tokens in every preset, so switching resets them", () => {
    const tokens = Object.keys(OCEAN_PRESETS.ocean).sort();
    for (const name of names) {
      const preset = OCEAN_PRESETS[name as keyof typeof OCEAN_PRESETS];
      expect(Object.keys(preset).sort(), name).toEqual(tokens);
      for (const value of Object.values(preset)) {
        expect(typeof value, name).toBe("string");
      }
    }
  });

  it("leaves None with no ocean at all", () => {
    const { none } = OCEAN_PRESETS;
    expect(none.base).toBe("transparent");
    expect(none.gradient).toBe("none");
    for (const token of [
      "rayColor",
      "waveColor",
      "bubbleBorder",
      "bubbleFill",
    ] as const) {
      expect(none[token], token).toBe("transparent");
    }
  });

  it("restyles a drawn shell in place, without rebuilding the ocean", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const shell = createShell(container);
    const ocean = shell.root.querySelector(".vcv-ocean")!;
    const bubble = ocean.querySelector(".vcv-ocean__bubble");
    shell.setTheme({ ocean: { ...OCEAN_PRESETS.deep, opacity: "0.4" } });
    expect(shell.root.style.getPropertyValue("--vcv-ocean-base")).toBe(
      OCEAN_PRESETS.deep.base,
    );
    expect(shell.root.style.getPropertyValue("--vcv-ocean-opacity")).toBe(
      "0.4",
    );
    expect(ocean.querySelector(".vcv-ocean__bubble")).toBe(bubble);
  });
});
