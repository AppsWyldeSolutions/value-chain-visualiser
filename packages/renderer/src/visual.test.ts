// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type KpiRow } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createVisual, defaultSelection } from "./visual.js";

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

function mount(options: Partial<Parameters<typeof createVisual>[1]> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onChange = vi.fn();
  const visual = createVisual(container, { rows: ROWS, onChange, ...options });
  const root = visual.root;
  const select = (name: string) => {
    const input = root.querySelector<HTMLSelectElement>(
      `.vcv-control--${name} select`,
    );
    if (!input) throw new Error(`no ${name} select`);
    return input;
  };
  const picker = (name: string) => {
    const input = root.querySelector<HTMLInputElement>(
      `.vcv-control--${name} input`,
    );
    if (!input) throw new Error(`no ${name} picker`);
    return input;
  };
  return { container, visual, root, onChange, select, picker };
}

function cards(root: Element): Element[] {
  return Array.from(root.querySelectorAll(".vcv-grid > .vcv-card"));
}

function tooltipPeriods(root: Element): Set<string | undefined> {
  return new Set(
    Array.from(
      root.querySelectorAll(".vcv-kpi"),
      (kpi) => kpi.getAttribute("title")?.split("\n")[1],
    ),
  );
}

function subtitle(root: Element): string | null | undefined {
  return root.querySelector(".vcv-header__subtitle")?.textContent;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("defaultSelection", () => {
  it("picks the latest period with actuals in the latest year", () => {
    expect(defaultSelection(ROWS)).toEqual({ year: 2026, period: "August" });
  });

  it("falls back to January of the latest year when nothing has actuals", () => {
    const empty = ROWS.map((row) => ({ ...row, actual: null }));
    expect(defaultSelection(empty)).toEqual({ year: 2026, period: "January" });
  });
});

describe("createVisual", () => {
  it("puts the controls in the header and every link in the grid", () => {
    const { root } = mount();
    expect(
      root.querySelector(".vcv-header__controls .vcv-controls"),
    ).not.toBeNull();
    expect(cards(root)).toHaveLength(9);
    expect(root.querySelectorAll(".vcv-card--score")).toHaveLength(1);
    expect(root.querySelector(".vcv-grid > .vcv-connectors")).not.toBeNull();
  });

  it("opens on the default selection and says how many KPIs it shows", () => {
    const { root, select, visual } = mount();
    expect(select("year").value).toBe("2026");
    expect(select("period").value).toBe("August");
    // Process primaries and satellites plus the Score Card's 12.
    expect(subtitle(root)).toBe(
      "August 2026 · 53 KPIs measured against budget",
    );
    expect(tooltipPeriods(root)).toEqual(new Set(["August 2026"]));
    expect(visual.state()).toEqual({
      year: 2026,
      period: "August",
      fillColor: "#8fd3f4",
      shortfallColor: "#ff9f40",
    });
  });

  it("offers the data's years and one either side", () => {
    const { select } = mount();
    expect(Array.from(select("year").options, (o) => o.value)).toEqual([
      "2025",
      "2026",
      "2027",
    ]);
    expect(select("period").options).toHaveLength(12);
  });

  it("redraws every KPI when the period changes, and reports it", () => {
    const { root, select, onChange } = mount();
    const before = cards(root);
    select("period").value = "July";
    select("period").dispatchEvent(new Event("change"));

    expect(tooltipPeriods(root)).toEqual(new Set(["July 2026"]));
    expect(subtitle(root)).toBe("July 2026 · 53 KPIs measured against budget");
    const after = cards(root);
    expect(after).toHaveLength(9);
    for (const card of after) expect(before).not.toContain(card);
    expect(onChange).toHaveBeenLastCalledWith({
      year: 2026,
      period: "July",
      fillColor: "#8fd3f4",
      shortfallColor: "#ff9f40",
    });
  });

  it("keeps the arrows' overlay when the cards are replaced", () => {
    const { root, select } = mount();
    const overlay = root.querySelector(".vcv-connectors");
    select("period").value = "July";
    select("period").dispatchEvent(new Event("change"));
    expect(root.querySelector(".vcv-connectors")).toBe(overlay);
    // The cards stay ahead of the overlays.
    const children = Array.from(
      root.querySelector(".vcv-grid")?.children ?? [],
    );
    expect(
      children.slice(0, 9).every((c) => c.classList.contains("vcv-card")),
    ).toBe(true);
  });

  it("shows every link as having no data for a period without figures", () => {
    const { root, select } = mount();
    select("period").value = "September";
    select("period").dispatchEvent(new Event("change"));
    expect(cards(root)).toHaveLength(9);
    expect(subtitle(root)).toBe(
      "September 2026 · No data loaded for this period",
    );
    expect(
      root.querySelectorAll(".vcv-sphere:not(.vcv-sphere--no-data)"),
    ).toHaveLength(0);
  });

  it("keeps every link, with no data, for a year the data does not cover", () => {
    const { root, select } = mount();
    select("year").value = "2025";
    select("year").dispatchEvent(new Event("change"));
    expect(cards(root)).toHaveLength(9);
    // Every card KPI is there (jsdom has no layout, so no arrows or popovers).
    expect(root.querySelectorAll(".vcv-card .vcv-kpi")).toHaveLength(53);
    expect(tooltipPeriods(root)).toEqual(new Set(["August 2025"]));
    expect(subtitle(root)).toBe("August 2025 · No data loaded for this period");
  });

  it("recolours from the pickers without rebuilding the cards", () => {
    const { root, picker, onChange } = mount();
    const before = cards(root);
    picker("fill").value = "#00ff00";
    picker("fill").dispatchEvent(new Event("input"));
    picker("shortfall").value = "#ff00ff";
    picker("shortfall").dispatchEvent(new Event("input"));

    expect(root.style.getPropertyValue("--vcv-fill-color")).toBe("#00ff00");
    expect(root.style.getPropertyValue("--vcv-shortfall-color")).toBe(
      "#ff00ff",
    );
    expect(cards(root)).toEqual(before);
    expect(onChange).toHaveBeenLastCalledWith({
      year: 2026,
      period: "August",
      fillColor: "#00ff00",
      shortfallColor: "#ff00ff",
    });
  });

  it("can be set from outside without reporting a change", () => {
    const { root, visual, select, picker, onChange } = mount();
    visual.setSelection({ year: 2026, period: "July" });
    visual.setTheme({ fillColor: "#123456" });
    expect(select("period").value).toBe("July");
    expect(picker("fill").value).toBe("#123456");
    expect(tooltipPeriods(root)).toEqual(new Set(["July 2026"]));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("takes new rows, keeping the selection", () => {
    const { root, visual } = mount({
      selection: { year: 2026, period: "July" },
    });
    const bu1 = ROWS.filter((row: KpiRow) => row.node.startsWith("BU1"));
    visual.setRows(bu1);
    expect(cards(root)).toHaveLength(1);
    expect(tooltipPeriods(root)).toEqual(new Set(["July 2026"]));
  });

  it("starts from the selection and theme it is given", () => {
    const { select, picker, root } = mount({
      selection: { year: 2026, period: "March" },
      theme: { shortfallColor: "#aa0000" },
    });
    expect(select("period").value).toBe("March");
    expect(picker("shortfall").value).toBe("#aa0000");
    expect(root.style.getPropertyValue("--vcv-shortfall-color")).toBe(
      "#aa0000",
    );
  });

  it("removes everything on destroy", () => {
    const { container, visual } = mount();
    visual.destroy();
    expect(container.childElementCount).toBe(0);
  });
});
