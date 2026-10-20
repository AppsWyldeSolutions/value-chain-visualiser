// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type EvaluatedKpi } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nodeHeading } from "./card.js";
import { kpiOf } from "./kpi.js";
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
    rows: ROWS,
    selection: { year: 2026, period: "August" },
    ...options,
  });
  return { visual, root: visual.root };
}

const bars = (root: Element) =>
  Array.from(root.querySelectorAll<HTMLElement>(".vcv-grid .vcv-bar"));
const detail = (root: Element) =>
  root.querySelector<HTMLElement>(".vcv-detail:not([hidden])");
const click = (target: Element | null | undefined, init: MouseEventInit = {}) =>
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, ...init }));
const key = (target: Element, name: string) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true }),
  );

afterEach(() => {
  document.body.replaceChildren();
});

describe("cardDisplay", () => {
  it("is compact by default: one bar per link, each in its own slot", () => {
    const { root } = mount();
    expect(root.classList.contains("vcv-root--compact")).toBe(true);
    const slots = root.querySelectorAll(".vcv-grid > .vcv-slot");
    expect(slots).toHaveLength(9);
    for (const slot of slots) {
      expect(slot.querySelectorAll(":scope > .vcv-bar")).toHaveLength(1);
    }
    expect(root.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(0);
  });

  it("is today's full cards with 'full'", () => {
    const { root } = mount({ cardDisplay: "full" });
    expect(root.classList.contains("vcv-root--compact")).toBe(false);
    expect(root.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(9);
    expect(bars(root)).toHaveLength(0);
  });

  it("switches in place, both ways", () => {
    const { root, visual } = mount();
    visual.setCardDisplay("full");
    expect(visual.root).toBe(root);
    expect(root.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(9);
    expect(bars(root)).toHaveLength(0);
    visual.setCardDisplay("compact");
    expect(bars(root)).toHaveLength(9);
  });
});

describe("a compact process bar", () => {
  it("shows the code, the primary KPI, a divider and the satellites", () => {
    const { root } = mount();
    const bar = bars(root)[0]!;
    const node = "BU1 - P2: Product Development";
    expect(bar.querySelector(".vcv-bar__code")?.textContent).toBe(
      nodeHeading(node).eyebrow,
    );
    const primary = bar.querySelector(".vcv-bar__primary")!;
    expect(primary.querySelectorAll(".vcv-sphere")).toHaveLength(1);
    expect(primary.querySelector(".vcv-bar__pct")?.textContent).toBe("100%");
    expect(
      bar.querySelector(".vcv-bar__primary + .vcv-bar__divider"),
    ).not.toBeNull();
    const list = bar.querySelector(".vcv-bar__list")!;
    const satellites = ROWS.filter(
      (row) =>
        row.node === node &&
        row.group === "Satellite" &&
        row.period === "August",
    );
    expect(list.querySelectorAll(".vcv-sphere")).toHaveLength(
      satellites.length,
    );
    expect(list.querySelectorAll(".vcv-bar__pct")).toHaveLength(
      satellites.length,
    );
  });

  it("names every sphere: role img, with the KPI's label and figures", () => {
    const { root } = mount();
    const sphere = bars(root)[0]!.querySelector(
      ".vcv-bar__primary .vcv-sphere",
    )!;
    expect(sphere.getAttribute("role")).toBe("img");
    expect(sphere.getAttribute("aria-label")).toBe(
      "Product Launch Milestones Delivered > RF Plan — 10 / 10 (100%)",
    );
  });

  it("is a button that says what it opens", () => {
    const { root } = mount();
    const bar = bars(root)[0]!;
    expect(bar.getAttribute("role")).toBe("button");
    expect(bar.getAttribute("tabindex")).toBe("0");
    expect(bar.getAttribute("aria-haspopup")).toBe("dialog");
    expect(bar.getAttribute("aria-expanded")).toBe("false");
    expect(bar.getAttribute("aria-label")).toContain("Product Development");
  });
});

describe("the compact Score Card bar", () => {
  it("is the last bar: primary KPIs on top, then each sub-group, divided", () => {
    const { root } = mount();
    const score = bars(root).at(-1)!;
    expect(score.classList.contains("vcv-bar--score")).toBe(true);
    const lists = score.querySelectorAll(".vcv-bar__list");
    expect(lists).toHaveLength(4);
    expect(score.querySelectorAll(".vcv-bar__divider")).toHaveLength(3);
    const firstList = Array.from(lists[0]!.querySelectorAll(".vcv-sphere"));
    expect(firstList.length).toBeGreaterThan(0);
    expect(score.querySelector(".vcv-bar__primary")).toBeNull();
  });
});

describe("the detail popup", () => {
  it("opens with the full card when a bar is clicked, and closes on a second click", () => {
    const { root } = mount();
    const bar = bars(root)[0]!;
    click(bar);
    const popup = detail(root)!;
    expect(popup.getAttribute("role")).toBe("dialog");
    expect(popup.querySelector(".vcv-card .vcv-card__title")?.textContent).toBe(
      "Product Development",
    );
    expect(bar.getAttribute("aria-expanded")).toBe("true");
    click(bar);
    expect(detail(root)).toBeNull();
    expect(bar.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the full Score Card for the Score Card bar", () => {
    const { root } = mount();
    click(bars(root).at(-1));
    expect(detail(root)?.querySelector(".vcv-card--score")).not.toBeNull();
  });

  it("moves to another bar, one popup at a time", () => {
    const { root } = mount();
    click(bars(root)[0]);
    click(bars(root)[1]);
    expect(root.querySelectorAll(".vcv-detail:not([hidden])")).toHaveLength(1);
    expect(bars(root)[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(bars(root)[1]!.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes on its close button, a click elsewhere, or Escape", () => {
    const { root } = mount();
    click(bars(root)[0]);
    click(detail(root)!.querySelector(".vcv-detail__close"));
    expect(detail(root)).toBeNull();

    click(bars(root)[0]);
    click(document.body);
    expect(detail(root)).toBeNull();

    click(bars(root)[0]);
    key(document.body, "Escape");
    expect(detail(root)).toBeNull();
  });

  it("stays open for clicks inside it", () => {
    const { root } = mount();
    click(bars(root)[0]);
    click(detail(root)!.querySelector(".vcv-card__title"));
    expect(detail(root)).not.toBeNull();
  });

  it("opens and closes from the keyboard, and gives focus back", () => {
    const { root } = mount();
    const bar = bars(root)[2]!;
    bar.focus();
    key(bar, "Enter");
    expect(detail(root)).not.toBeNull();
    key(bar, " ");
    expect(detail(root)).toBeNull();
    key(bar, " ");
    expect(detail(root)).not.toBeNull();
    key(document.body, "Escape");
    expect(detail(root)).toBeNull();
    expect(document.activeElement).toBe(bar);
  });

  it("moves focus into the popup when opened from the keyboard", () => {
    const { root } = mount();
    const bar = bars(root)[1]!;
    bar.focus();
    key(bar, "Enter");
    expect(document.activeElement).toBe(
      detail(root)!.querySelector(".vcv-detail__close"),
    );
  });

  it("closes when the cards redraw or the display changes", () => {
    const { root, visual } = mount();
    click(bars(root)[0]);
    visual.setSelection({ year: 2026, period: "July" });
    expect(detail(root)).toBeNull();
    click(bars(root)[0]);
    visual.setCardDisplay("full");
    expect(detail(root)).toBeNull();
  });
});

describe("clicks and selection in compact mode", () => {
  it("a sphere in a bar opens the popup, it does not select", () => {
    const onSelect = vi.fn();
    const onDeselect = vi.fn();
    const { root } = mount({ onSelect, onDeselect });
    click(bars(root)[0]!.querySelector(".vcv-sphere"));
    expect(detail(root)).not.toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDeselect).not.toHaveBeenCalled();
  });

  it("a sphere in the popup's card selects its KPI, as in full mode", () => {
    const onSelect = vi.fn();
    const { root } = mount({ onSelect });
    click(bars(root)[0]);
    click(detail(root)!.querySelector(".vcv-kpi .vcv-sphere"), {
      ctrlKey: true,
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    const [kpi, how] = onSelect.mock.calls[0]! as [
      EvaluatedKpi,
      { multi: boolean },
    ];
    expect(kpi.row.metric).toBe(
      "Product Launch Milestones Delivered > RF Plan",
    );
    expect(how).toEqual({ multi: true });
  });

  it("dims the bars none of whose KPIs is selected", () => {
    const { root, visual } = mount();
    visual.setSelectedKpis(
      (kpi) =>
        kpi.row.metric === "Product Launch Milestones Delivered > RF Plan",
    );
    const dimmed = bars(root).filter((bar) =>
      bar.classList.contains("vcv-card--dimmed"),
    );
    expect(dimmed).toHaveLength(8);
    expect(dimmed).not.toContain(bars(root)[0]);
  });
});

describe("sphere tooltips", () => {
  const hover = (type: string, target: Element) =>
    target.dispatchEvent(new MouseEvent(type, { bubbles: true }));

  it("shows the sphere's label and figures on hover, and hides after", () => {
    const { root } = mount();
    const sphere = bars(root)[0]!.querySelector(
      ".vcv-bar__primary .vcv-sphere",
    )!;
    hover("mouseover", sphere);
    const tip = root.querySelector<HTMLElement>(".vcv-tip:not([hidden])");
    expect(tip?.getAttribute("role")).toBe("tooltip");
    expect(tip?.textContent).toBe(sphere.getAttribute("aria-label"));
    hover("mouseout", sphere);
    expect(root.querySelector(".vcv-tip:not([hidden])")).toBeNull();
  });

  it("leaves tooltips to the host when it draws its own", () => {
    const tooltip = { show: vi.fn(), move: vi.fn(), hide: vi.fn() };
    const { root } = mount({ tooltip });
    const sphere = bars(root)[0]!.querySelector(
      ".vcv-bar__primary .vcv-sphere",
    )!;
    hover("mouseover", sphere);
    sphere.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    expect(root.querySelector(".vcv-tip:not([hidden])")).toBeNull();
    const [target] = tooltip.show.mock.calls[0]!;
    expect(target.kind).toBe("kpi");
    expect(target.kpi).toBe(kpiOf(sphere.closest(".vcv-bar__kpi")!));
  });
});

describe("compact styles", () => {
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`${escaped}[^{]*\\{[^}]*\\}`).exec(stylesText)?.[0] ?? "";
  };

  it("keeps the chain to one row of slots that scale with their own width", () => {
    const grid = rule(".vcv-root--compact .vcv-grid");
    expect(grid).toContain("grid-auto-flow: column");
    expect(rule(".vcv-slot")).toContain("container-type: inline-size");
    expect(rule(".vcv-bar {")).toContain("width: fit-content");
  });

  it("sizes the bars from compact tokens that scale with the slot", () => {
    const vars = themeToCssVars(defaultTheme);
    const compact = Object.entries(vars).filter(([name]) =>
      name.startsWith("--vcv-compact-"),
    );
    expect(compact.length).toBeGreaterThan(0);
    for (const [name, value] of compact) {
      expect(value, name).not.toMatch(/#|rgb|gradient/);
    }
    expect(vars["--vcv-compact-primary-sphere-size"]).toMatch(/clamp\(.*cqw/);
    expect(vars["--vcv-compact-sphere-size"]).toMatch(/clamp\(.*cqw/);
  });

  it("has no colour or size literals in its own rules", () => {
    for (const selector of [
      ".vcv-bar {",
      ".vcv-bar__code",
      ".vcv-detail {",
      ".vcv-tip",
    ]) {
      expect(rule(selector), selector).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgba?\(|\d+px/i,
      );
    }
  });

  it("fades the popup and tooltip in, except for reduced motion", () => {
    expect(rule(".vcv-detail {")).toContain(
      "animation: vcv-fade-in var(--vcv-motion-popup-duration)",
    );
    expect(stylesText).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[^@]*\.vcv-detail[^@]*\.vcv-tip[^}]*animation: none/,
    );
  });
});

describe("compact mode in a shadow root", () => {
  it("keeps the popup open for the click that opened it", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    shadow.appendChild(container);
    const visual = createVisual(container, { rows: ROWS });
    bars(visual.root)[0]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    expect(detail(visual.root)).not.toBeNull();
    // A click outside the host still closes it.
    click(document.body);
    expect(detail(visual.root)).toBeNull();
  });
});
