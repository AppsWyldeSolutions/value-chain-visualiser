// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it } from "vitest";
import { stylesText } from "./styles.js";
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

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return createVisual(container, { rows: ROWS });
}

const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}[^{]*\\{[^}]*\\}`).exec(stylesText)?.[0] ?? "";
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("Visual.setEmpty", () => {
  it("shows no message by default", () => {
    const visual = mount();
    expect(visual.root.querySelector(".vcv-empty")).toBeNull();
    expect(visual.root.classList.contains("vcv-root--empty")).toBe(false);
  });

  it("shows the message in place of the chain", () => {
    const visual = mount();
    visual.setEmpty("Add Node, Metric, Actual and Budget");
    const message = visual.root.querySelector(".vcv-empty");
    expect(message?.textContent).toBe("Add Node, Metric, Actual and Budget");
    expect(message?.getAttribute("role")).toBe("status");
    expect(visual.root.classList.contains("vcv-root--empty")).toBe(true);
    expect(rule(".vcv-root--empty .vcv-grid")).toContain("display: none");
    expect(rule(".vcv-root--empty .vcv-header__subtitle")).toContain(
      "display: none",
    );
  });

  it("sets the text as text, never as markup", () => {
    const visual = mount();
    visual.setEmpty("<img src=x onerror=alert(1)>");
    const message = visual.root.querySelector(".vcv-empty")!;
    expect(message.querySelector("img")).toBeNull();
    expect(message.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("replaces one message with the next, and clears with null", () => {
    const visual = mount();
    visual.setEmpty("Add Year and Period");
    visual.setEmpty("Add Budget");
    expect(visual.root.querySelectorAll(".vcv-empty")).toHaveLength(1);
    expect(visual.root.querySelector(".vcv-empty")?.textContent).toBe(
      "Add Budget",
    );
    visual.setEmpty(null);
    expect(visual.root.querySelector(".vcv-empty")).toBeNull();
    expect(visual.root.classList.contains("vcv-root--empty")).toBe(false);
  });

  it("is styled from the theme only", () => {
    const style = rule(".vcv-empty");
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px/i);
    expect(style).toContain("var(--vcv-");
  });
});
