// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import { kpiOf, tooltipItems } from "@appswyldesolutions/vcv-renderer";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it } from "vitest";
import { testHost } from "./testHost";
import { tableOf } from "./testTable";
import { Visual } from "./visual";

// These tests are about the full cards (Display → Card display: Full);
// compact mode has its own tests.
const FULL = { display: { cardDisplay: "full" } };

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

/** The fixture's table plus two tooltip fields a report might add. */
function tableWithTooltips(): powerbi.DataViewTable {
  const table = tableOf(ROWS);
  const at = table.columns.length;
  table.columns.push(
    {
      displayName: "Owner",
      queryName: "Kpis.owner",
      index: at,
      roles: { tooltips: true },
    },
    {
      displayName: "Forecast",
      queryName: "Sum(Kpis.forecast)",
      index: at + 1,
      roles: { tooltips: true },
    },
  );
  table.rows.forEach((values, row) =>
    values.push(`Owner ${row}`, 1234.5 + row),
  );
  return table;
}

function construct(table = tableOf(ROWS)) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const stub = testHost();
  const visual = new Visual({
    element,
    host: stub.host,
  } as powerbi.extensibility.visual.VisualConstructorOptions);
  const update = () =>
    visual.update({
      dataViews: [{ table, metadata: { columns: [], objects: FULL } }],
    } as unknown as powerbi.extensibility.visual.VisualUpdateOptions);
  update();
  return { element, visual, update, table, ...stub };
}

const move = (target: Element, x = 40, y = 60) =>
  target.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: y }),
  );

/** The table row behind a KPI element (August 2026). */
const rowIndexOf = (kpi: Element) => {
  const { row } = kpiOf(kpi)!;
  return ROWS.findIndex(
    (r) =>
      r.node === row.node &&
      r.metric === row.metric &&
      r.year === row.year &&
      r.period === row.period,
  );
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("tooltips", () => {
  it("shows a KPI's tooltip through Power BI's tooltip service", () => {
    const { element, tooltipService } = construct();
    const kpi = element.querySelector(".vcv-card .vcv-kpi")!;
    move(kpi.querySelector(".vcv-sphere")!, 40, 60);
    expect(tooltipService.show).toHaveBeenCalledTimes(1);
    const [options] = tooltipService.show.mock.calls[0]!;
    expect(options.coordinates).toEqual([40, 60]);
    expect(options.isTouchEvent).toBe(false);
    expect(options.dataItems).toEqual(
      tooltipItems({ kind: "kpi", kpi: kpiOf(kpi)! }),
    );
    expect(options.identities.map((id: { row: number }) => id.row)).toEqual([
      rowIndexOf(kpi),
    ]);
  });

  it("measures its coordinates from the visual's own corner", () => {
    const { element, tooltipService } = construct();
    element.getBoundingClientRect = () => ({ left: 100, top: 30 }) as DOMRect;
    move(element.querySelector(".vcv-card .vcv-sphere")!, 140, 90);
    expect(tooltipService.show.mock.calls[0]![0].coordinates).toEqual([40, 60]);
  });

  it("moves it with the pointer and hides it off the cards", () => {
    const { element, tooltipService } = construct();
    const sphere = element.querySelector(".vcv-card .vcv-sphere")!;
    move(sphere, 40, 60);
    move(sphere, 44, 66);
    expect(tooltipService.move.mock.calls[0]![0].coordinates).toEqual([44, 66]);
    move(element.querySelector(".vcv-header__title")!);
    expect(tooltipService.hide).toHaveBeenCalledWith({
      isTouchEvent: false,
      immediately: true,
    });
  });

  it("shows a card's link and on-target count away from its KPIs", () => {
    const { element, tooltipService } = construct();
    move(element.querySelector(".vcv-card__title")!);
    const [options] = tooltipService.show.mock.calls[0]!;
    expect(options.dataItems[0]).toEqual({
      displayName: "Link",
      value: "BU1 - P2: Product Development",
    });
    expect(options.identities).toEqual([]);
  });

  it("adds the report's tooltip fields for the KPI's row", () => {
    const { element, tooltipService } = construct(tableWithTooltips());
    const kpi = element.querySelector(".vcv-card .vcv-kpi")!;
    move(kpi.querySelector(".vcv-sphere")!);
    const row = rowIndexOf(kpi);
    const items = tooltipService.show.mock.calls[0]![0].dataItems;
    expect(items.slice(-2)).toEqual([
      { displayName: "Owner", value: `Owner ${row}` },
      {
        displayName: "Forecast",
        value: new Intl.NumberFormat("en-US").format(1234.5 + row),
      },
    ]);
  });

  it("shows nothing while the host has tooltips turned off", () => {
    const { element, tooltipService } = construct();
    tooltipService.enabled.mockReturnValue(false);
    move(element.querySelector(".vcv-card .vcv-sphere")!);
    expect(tooltipService.show).not.toHaveBeenCalled();
  });

  it("leaves no native title tooltips", () => {
    const { element } = construct();
    const kpi = element.querySelector(".vcv-card .vcv-kpi")!;
    kpi
      .querySelector(".vcv-sphere")!
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(kpi.getAttribute("title")).toBeNull();
  });
});

describe("high contrast", () => {
  const flat = (element: Element) =>
    element.querySelector(".vcv-root")!.classList.contains("vcv-root--flat");
  const css = (element: Element, name: string) =>
    element
      .querySelector<HTMLElement>(".vcv-root")!
      .style.getPropertyValue(name);

  it("draws the glass theme normally", () => {
    const { element } = construct();
    expect(flat(element)).toBe(false);
  });

  it("switches to the flat theme in the palette's colours, and back", () => {
    const { element, update, colorPalette } = construct();
    colorPalette.isHighContrast = true;
    update();
    expect(flat(element)).toBe(true);
    expect(css(element, "--vcv-fill-color")).toBe("#ffff00");
    expect(css(element, "--vcv-shortfall-color")).toBe("#ff00ff");
    expect(css(element, "--vcv-glass-card-background")).toBe("#000000");
    colorPalette.isHighContrast = false;
    update();
    expect(flat(element)).toBe(false);
    expect(css(element, "--vcv-fill-color")).not.toBe("#ffff00");
  });
});
