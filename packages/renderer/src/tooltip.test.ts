// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type EvaluatedKpi } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kpiOf } from "./kpi.js";
import { tooltipItems } from "./tooltip.js";
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
  return createVisual(container, {
    cardDisplay: "full",
    rows: ROWS,
    selection: { year: 2026, period: "August" },
    ...options,
  }).root;
}

function hover(
  type: string,
  target: Element | null | undefined,
  x = 10,
  y = 20,
) {
  target?.dispatchEvent(
    new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
  );
}

function handlers() {
  return { show: vi.fn(), move: vi.fn(), hide: vi.fn() };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createVisual tooltip", () => {
  it("shows the KPI under the pointer, then follows it", () => {
    const tooltip = handlers();
    const root = mount({ tooltip });
    const kpi = root.querySelector(".vcv-card .vcv-kpi")!;
    const sphere = kpi.querySelector(".vcv-sphere")!;
    hover("mousemove", sphere, 10, 20);
    hover("mousemove", sphere, 12, 24);
    expect(tooltip.show).toHaveBeenCalledTimes(1);
    expect(tooltip.show).toHaveBeenCalledWith(
      { kind: "kpi", kpi: kpiOf(kpi) },
      { x: 10, y: 20 },
    );
    expect(tooltip.move).toHaveBeenCalledWith(
      { kind: "kpi", kpi: kpiOf(kpi) },
      { x: 12, y: 24 },
    );
  });

  it("shows the card's link away from its KPIs", () => {
    const tooltip = handlers();
    const root = mount({ tooltip });
    hover("mousemove", root.querySelector(".vcv-card__title"));
    const [target] = tooltip.show.mock.calls[0]!;
    expect(target.kind).toBe("card");
    expect(target.node.node).toBe("BU1 - P2: Product Development");
  });

  it("shows a new tooltip when the pointer reaches another KPI", () => {
    const tooltip = handlers();
    const root = mount({ tooltip });
    const [first, second] = root.querySelectorAll(".vcv-card .vcv-kpi");
    hover("mousemove", first);
    hover("mousemove", second);
    expect(tooltip.show).toHaveBeenCalledTimes(2);
    expect(tooltip.show.mock.calls[1]![0].kpi).toBe(kpiOf(second!));
  });

  it("hides it off the cards and when the pointer leaves", () => {
    const tooltip = handlers();
    const root = mount({ tooltip });
    hover("mousemove", root.querySelector(".vcv-card .vcv-sphere"));
    hover("mousemove", root.querySelector(".vcv-header__title"));
    expect(tooltip.hide).toHaveBeenCalledTimes(1);
    hover("mousemove", root.querySelector(".vcv-card .vcv-sphere"));
    root.dispatchEvent(new MouseEvent("mouseleave"));
    expect(tooltip.hide).toHaveBeenCalledTimes(2);
  });

  it("leaves no native title tooltips to double up with the host's", () => {
    const root = mount({ tooltip: handlers() });
    const kpi = root.querySelector(".vcv-card .vcv-kpi")!;
    hover("mouseover", kpi.querySelector(".vcv-sphere"));
    expect(kpi.getAttribute("title")).toBeNull();
  });

  it("keeps the native title tooltips when no handlers are given", () => {
    const root = mount();
    const kpi = root.querySelector(".vcv-card .vcv-kpi")!;
    hover("mouseover", kpi.querySelector(".vcv-sphere"));
    expect(kpi.getAttribute("title")).toContain("August 2026");
  });
});

describe("tooltipItems", () => {
  const kpiIn = (metric: string): EvaluatedKpi => {
    const root = mount();
    const element = Array.from(root.querySelectorAll(".vcv-kpi")).find(
      (kpi) => kpiOf(kpi)?.row.metric === metric,
    )!;
    return kpiOf(element)!;
  };

  it("lists a KPI's period, figures, rule and status", () => {
    const kpi = kpiIn("Product Launch Milestones Delivered > RF Plan");
    expect(tooltipItems({ kind: "kpi", kpi })).toEqual([
      { displayName: "KPI", value: kpi.row.metric },
      { displayName: "Period", value: "August 2026" },
      { displayName: "Actual", value: kpi.actual },
      { displayName: "Budget", value: kpi.budget },
      { displayName: "Rule", value: "Actual at or above budget" },
      {
        displayName: "Status",
        value: kpi.met ? "Target met" : "Below budget",
      },
    ]);
  });

  it("says when a KPI has no data for the period", () => {
    const root = mount({ selection: { year: 2026, period: "December" } });
    const kpi = kpiOf(root.querySelector(".vcv-card .vcv-kpi")!)!;
    expect(tooltipItems({ kind: "kpi", kpi })).toEqual([
      { displayName: "KPI", value: kpi.row.metric },
      { displayName: "Period", value: "December 2026" },
      { displayName: "Status", value: "No data for this period" },
    ]);
  });

  it("names a card's link and how many of its KPIs are on target", () => {
    const tooltip = handlers();
    const root = mount({ tooltip });
    hover("mousemove", root.querySelector(".vcv-card__title"));
    const [target] = tooltip.show.mock.calls[0]!;
    const pill = root.querySelector(".vcv-card__pill")?.textContent ?? "";
    const [onTarget, total] = pill.match(/\d+/g)!;
    expect(tooltipItems(target)).toEqual([
      { displayName: "Link", value: "BU1 - P2: Product Development" },
      { displayName: "On target", value: `${onTarget} of ${total}` },
    ]);
  });
});
