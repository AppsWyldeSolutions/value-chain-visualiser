// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_HEADING } from "./shell.js";
import { stylesText } from "./styles.js";
import { defaultTheme, themeToCssVars } from "./theme.js";
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
const text = (root: Element, selector: string) =>
  root.querySelector(selector)?.textContent;

afterEach(() => {
  document.body.replaceChildren();
});

describe("Visual.setNotice", () => {
  it("shows no notice by default", () => {
    expect(mount().root.querySelector(".vcv-notice")).toBeNull();
  });

  it("shows the notice between the header and the cards", () => {
    const visual = mount();
    visual.setNotice(
      "Showing August 2026, the latest with actuals of 12 periods",
    );
    const notice = visual.root.querySelector(".vcv-notice")!;
    expect(notice.textContent).toBe(
      "Showing August 2026, the latest with actuals of 12 periods",
    );
    expect(notice.getAttribute("role")).toBe("status");
    expect(
      notice.previousElementSibling?.classList.contains("vcv-header"),
    ).toBe(true);
    expect(notice.nextElementSibling?.classList.contains("vcv-grid")).toBe(
      true,
    );
  });

  it("sets the text as text, never as markup", () => {
    const visual = mount();
    visual.setNotice("<b onclick=alert(1)>x</b>");
    const notice = visual.root.querySelector(".vcv-notice")!;
    expect(notice.querySelector("b")).toBeNull();
    expect(notice.textContent).toBe("<b onclick=alert(1)>x</b>");
  });

  it("replaces one notice with the next, and clears with null", () => {
    const visual = mount();
    visual.setNotice("one");
    visual.setNotice("two");
    expect(visual.root.querySelectorAll(".vcv-notice")).toHaveLength(1);
    expect(text(visual.root, ".vcv-notice")).toBe("two");
    visual.setNotice(null);
    expect(visual.root.querySelector(".vcv-notice")).toBeNull();
  });

  it("is styled from its own theme tokens only", () => {
    const vars = themeToCssVars(defaultTheme);
    for (const token of ["color", "background", "border", "size", "padding"]) {
      expect(vars[`--vcv-notice-${token}`], token).toBeTruthy();
    }
    const style = rule(".vcv-notice");
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|\d+px/i);
    expect(style).toContain("var(--vcv-notice-color)");
    expect(style).toContain("var(--vcv-notice-background)");
  });
});

describe("Visual.setHeader", () => {
  it("starts with the default heading", () => {
    const { root } = mount();
    expect(text(root, ".vcv-header__eyebrow")).toBe(DEFAULT_HEADING.eyebrow);
    expect(text(root, ".vcv-header__title")).toBe(DEFAULT_HEADING.title);
  });

  it("changes the eyebrow and title, as text, and keeps them across redraws", () => {
    const visual = mount();
    visual.setHeader({ eyebrow: "Group", title: "<i>Ops</i> chain" });
    visual.setSelection({ year: 2026, period: "July" });
    expect(text(visual.root, ".vcv-header__eyebrow")).toBe("Group");
    expect(text(visual.root, ".vcv-header__title")).toBe("<i>Ops</i> chain");
    expect(visual.root.querySelector(".vcv-header__title i")).toBeNull();
  });

  it("changes only what it is given", () => {
    const visual = mount();
    visual.setHeader({ title: "Ops" });
    expect(text(visual.root, ".vcv-header__eyebrow")).toBe(
      DEFAULT_HEADING.eyebrow,
    );
  });

  it("hides and shows the heading, and the subtitle on its own", () => {
    const visual = mount();
    visual.setHeader({ show: false });
    expect(visual.root.classList.contains("vcv-root--no-heading")).toBe(true);
    expect(rule(".vcv-root--no-heading .vcv-header__heading")).toContain(
      "display: none",
    );
    visual.setHeader({ show: true, showSubtitle: false });
    expect(visual.root.classList.contains("vcv-root--no-heading")).toBe(false);
    expect(visual.root.classList.contains("vcv-root--no-subtitle")).toBe(true);
    expect(rule(".vcv-root--no-subtitle .vcv-header__subtitle")).toContain(
      "display: none",
    );
    visual.setHeader({ showSubtitle: true });
    expect(visual.root.classList.contains("vcv-root--no-subtitle")).toBe(false);
  });
});
