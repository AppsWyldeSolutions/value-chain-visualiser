// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type EvaluatedKpi } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kpiOf } from "./kpi.js";
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

function mount(onSelect?: (kpi: EvaluatedKpi) => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return createVisual(container, { rows: ROWS, onSelect }).root;
}

function click(element: Element | null | undefined): void {
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("kpiOf", () => {
  it("returns the KPI a .vcv-kpi element was built from", () => {
    const root = mount();
    const kpi = kpiOf(root.querySelector(".vcv-kpi") as Element);
    expect(kpi?.row.metric).toBe(
      "Product Launch Milestones Delivered > RF Plan",
    );
    expect(kpiOf(root)).toBeUndefined();
  });
});

describe("createVisual onSelect", () => {
  it("is called with a KPI when its sphere is clicked", () => {
    const onSelect = vi.fn();
    const root = mount(onSelect);
    click(root.querySelectorAll(".vcv-card .vcv-sphere")[2]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const kpi = onSelect.mock.calls[0]?.[0] as EvaluatedKpi;
    expect(kpi.row.metric).toBe("New Funds Launched > RF Plan");
    expect(kpi.met).toBe(false);
  });

  it("hears a click on any part of the sphere", () => {
    const onSelect = vi.fn();
    const root = mount(onSelect);
    click(root.querySelector(".vcv-card .vcv-sphere__highlight"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks away from the spheres", () => {
    const onSelect = vi.fn();
    const root = mount(onSelect);
    click(root.querySelector(".vcv-kpi__label"));
    click(root.querySelector(".vcv-kpi__percent"));
    click(root.querySelector(".vcv-card__title"));
    click(root.querySelector(".vcv-header__title"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the spheres as clickable only when it is given", () => {
    expect(mount().classList.contains("vcv-root--selectable")).toBe(false);
    expect(mount(vi.fn()).classList.contains("vcv-root--selectable")).toBe(
      true,
    );
  });
});
