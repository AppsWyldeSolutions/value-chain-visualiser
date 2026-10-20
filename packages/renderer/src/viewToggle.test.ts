// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createControls, type ControlsValue } from "./controls.js";
import { highContrastTheme } from "./highContrast.js";
import { stylesText } from "./styles.js";
import { defaultTheme, resolveTheme, themeToCssVars } from "./theme.js";
import { createVisual, type VisualOptions } from "./visual.js";

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

const VALUE: ControlsValue = {
  year: 2026,
  period: "August",
  fillColor: "#8fd3f4",
  shortfallColor: "#ff9f40",
  cardDisplay: "compact",
};

afterEach(() => {
  document.body.replaceChildren();
});

function controls(onChange = vi.fn(), value = VALUE) {
  const built = createControls(document, {
    years: [2026],
    periods: ["July", "August"],
    value,
    onChange,
  });
  document.body.appendChild(built.element);
  const group = built.element.querySelector<HTMLElement>(
    ".vcv-control--view [role=radiogroup]",
  )!;
  const option = (name: string) =>
    Array.from(group.querySelectorAll<HTMLElement>("[role=radio]")).find(
      (radio) => radio.textContent === name,
    )!;
  return { built, group, option, onChange };
}

const checked = (radio: HTMLElement) => radio.getAttribute("aria-checked");
const key = (target: HTMLElement, name: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true }),
  );

describe("the View switch", () => {
  it("sits after Year and Period, named View, with Compact and Full card", () => {
    const { built, group } = controls();
    const names = Array.from(
      built.element.querySelectorAll(".vcv-control"),
      (control) => control.className.match(/vcv-control--(\w+)/)?.[1],
    );
    expect(names.slice(0, 3)).toEqual(["year", "period", "view"]);
    const label = built.element.querySelector(
      ".vcv-control--view .vcv-control__label",
    );
    expect(label?.textContent).toBe("View");
    expect(group.getAttribute("aria-labelledby")).toBe(label?.id);
    expect(
      Array.from(group.querySelectorAll("[role=radio]"), (r) => r.textContent),
    ).toEqual(["Compact", "Full card"]);
  });

  it("starts at the display it is given", () => {
    const compact = controls();
    expect(checked(compact.option("Compact"))).toBe("true");
    expect(checked(compact.option("Full card"))).toBe("false");
    document.body.replaceChildren();
    const full = controls(vi.fn(), { ...VALUE, cardDisplay: "full" });
    expect(checked(full.option("Full card"))).toBe("true");
  });

  it("reports a click on the other option, and nothing for the chosen one", () => {
    const { option, onChange } = controls();
    option("Compact").click();
    expect(onChange).not.toHaveBeenCalled();
    option("Full card").click();
    expect(onChange).toHaveBeenCalledWith({ cardDisplay: "full" });
  });

  it("has one tab stop, the chosen option, and moves with the arrow keys", () => {
    const { option, onChange } = controls();
    expect(option("Compact").tabIndex).toBe(0);
    expect(option("Full card").tabIndex).toBe(-1);
    option("Compact").focus();
    key(option("Compact"), "ArrowRight");
    expect(onChange).toHaveBeenCalledWith({ cardDisplay: "full" });
    expect(document.activeElement).toBe(option("Full card"));
  });

  it("shows a new value without reporting it", () => {
    const { built, option, onChange } = controls();
    built.update({ ...VALUE, cardDisplay: "full" });
    expect(checked(option("Full card"))).toBe("true");
    expect(option("Full card").tabIndex).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("the View switch in the visual", () => {
  function mount(options: Partial<VisualOptions> = {}) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onChange = vi.fn();
    const visual = createVisual(container, {
      rows: ROWS,
      onChange,
      ...options,
    });
    const option = (name: string) =>
      Array.from(
        visual.root.querySelectorAll<HTMLElement>(
          ".vcv-control--view [role=radio]",
        ),
      ).find((radio) => radio.textContent === name);
    return { visual, root: visual.root, onChange, option };
  }

  it("switches the display in place and reports the whole state", () => {
    const { root, option, onChange, visual } = mount();
    option("Full card")!.click();
    expect(visual.root).toBe(root);
    expect(root.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(9);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardDisplay: "full", period: "August" }),
    );
    expect(visual.state().cardDisplay).toBe("full");
    option("Compact")!.click();
    expect(root.querySelectorAll(".vcv-grid .vcv-bar")).toHaveLength(9);
  });

  it("starts at the cardDisplay option", () => {
    const { option } = mount({ cardDisplay: "full" });
    expect(checked(option("Full card")!)).toBe("true");
  });

  it("follows setCardDisplay without reporting it", () => {
    const { option, onChange, visual } = mount();
    visual.setCardDisplay("full");
    expect(checked(option("Full card")!)).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is not there without the renderer's own controls", () => {
    const { root } = mount({ showControls: false });
    expect(root.querySelector(".vcv-control--view")).toBeNull();
  });
});

describe("View switch styles", () => {
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`${escaped}[^{]*\\{[^}]*\\}`).exec(stylesText)?.[0] ?? "";
  };

  it("styles the chosen option from theme tokens only", () => {
    const vars = themeToCssVars(defaultTheme);
    expect(vars["--vcv-control-selected-background"]).toBeTruthy();
    expect(vars["--vcv-control-selected-color"]).toBeTruthy();
    const selected = rule('.vcv-segment[aria-checked="true"]');
    expect(selected).toContain("var(--vcv-control-selected-background)");
    for (const selector of [
      ".vcv-segments",
      ".vcv-segment {",
      '.vcv-segment[aria-checked="true"]',
    ]) {
      expect(rule(selector), selector).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgba?\(|\d+px/i,
      );
    }
  });

  it("is covered by high contrast", () => {
    const theme = resolveTheme(
      highContrastTheme({
        foreground: "#ffff00",
        background: "#000000",
        foregroundSelected: "#00ffff",
        hyperlink: "#ff00ff",
      }),
    );
    expect(theme.control.selectedBackground).toBe("#ffff00");
    expect(theme.control.selectedColor).toBe("#000000");
  });
});
