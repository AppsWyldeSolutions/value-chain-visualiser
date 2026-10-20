// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type EvaluatedKpi } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stylesText } from "./styles.js";
import { defaultTheme, themeToCssVars } from "./theme.js";
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

function mount(options: Partial<VisualOptions> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const visual = createVisual(container, {
    cardDisplay: "full",
    rows: ROWS,
    selection: { year: 2026, period: "August" },
    ...options,
  });
  return { visual, root: visual.root };
}

function click(element: Element | null | undefined, init: MouseEventInit = {}) {
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true, ...init }));
}

const cards = (root: Element) =>
  Array.from(root.querySelectorAll<HTMLElement>(".vcv-grid > .vcv-card"));
const dimmed = (root: Element) =>
  cards(root).filter((card) => card.classList.contains("vcv-card--dimmed"));
const sphereIn = (card: Element) => card.querySelector(".vcv-sphere");

afterEach(() => {
  document.body.replaceChildren();
});

describe("onSelect's multi flag", () => {
  it("is false for a plain click", () => {
    const onSelect = vi.fn();
    const { root } = mount({ onSelect });
    click(sphereIn(cards(root)[0]!));
    expect(onSelect.mock.calls[0]?.[1]).toEqual({ multi: false });
  });

  it("is true for a ctrl-click or a cmd-click", () => {
    const onSelect = vi.fn();
    const { root } = mount({ onSelect });
    click(sphereIn(cards(root)[0]!), { ctrlKey: true });
    click(sphereIn(cards(root)[1]!), { metaKey: true });
    expect(onSelect.mock.calls.map((call) => call[1])).toEqual([
      { multi: true },
      { multi: true },
    ]);
  });
});

describe("onDeselect", () => {
  it("is called for a click away from every sphere", () => {
    const onSelect = vi.fn();
    const onDeselect = vi.fn();
    const { root } = mount({ onSelect, onDeselect });
    click(root.querySelector(".vcv-card__title"));
    click(root.querySelector(".vcv-header__title"));
    click(root.querySelector(".vcv-grid"));
    expect(onDeselect).toHaveBeenCalledTimes(3);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("is not called for a click on a sphere", () => {
    const onDeselect = vi.fn();
    const { root } = mount({ onSelect: vi.fn(), onDeselect });
    click(sphereIn(cards(root)[0]!));
    expect(onDeselect).not.toHaveBeenCalled();
  });

  it("is not called for a click on the header controls", () => {
    const onDeselect = vi.fn();
    const { root } = mount({ onDeselect });
    click(root.querySelector(".vcv-controls select"));
    expect(onDeselect).not.toHaveBeenCalled();
  });
});

describe("setSelectedKpis", () => {
  const isMetric = (metric: string) => (kpi: EvaluatedKpi) =>
    kpi.row.metric === metric;

  it("dims every card without a selected KPI", () => {
    const { root, visual } = mount();
    expect(dimmed(root)).toHaveLength(0);
    visual.setSelectedKpis(
      isMetric("Product Launch Milestones Delivered > RF Plan"),
    );
    expect(dimmed(root)).toHaveLength(cards(root).length - 1);
    const kept = cards(root).find((card) => !dimmed(root).includes(card));
    expect(kept?.textContent).toContain("Product Launch Milestones");
  });

  it("keeps several cards when their KPIs are all selected", () => {
    const { root, visual } = mount();
    const metrics = new Set(
      cards(root)
        .slice(0, 2)
        .map((card) => card.querySelector(".vcv-kpi__label")?.textContent),
    );
    visual.setSelectedKpis((kpi) => metrics.has(kpi.row.metric));
    expect(dimmed(root)).toHaveLength(cards(root).length - 2);
  });

  it("restores every card when given null", () => {
    const { root, visual } = mount();
    visual.setSelectedKpis(
      isMetric("Product Launch Milestones Delivered > RF Plan"),
    );
    visual.setSelectedKpis(null);
    expect(dimmed(root)).toHaveLength(0);
  });

  it("stays applied when the cards are redrawn", () => {
    const { root, visual } = mount();
    visual.setSelectedKpis(
      isMetric("Product Launch Milestones Delivered > RF Plan"),
    );
    visual.setSelection({ year: 2026, period: "July" });
    expect(dimmed(root)).toHaveLength(cards(root).length - 1);
  });

  it("takes its opacity from the theme", () => {
    expect(defaultTheme.card.dimOpacity).toBe("0.35");
    expect(themeToCssVars(defaultTheme)["--vcv-card-dim-opacity"]).toBe("0.35");
    const rule = /\.vcv-card--dimmed \{[^}]*\}/.exec(stylesText)?.[0] ?? "";
    expect(rule).toContain("opacity: var(--vcv-card-dim-opacity)");
  });
});
