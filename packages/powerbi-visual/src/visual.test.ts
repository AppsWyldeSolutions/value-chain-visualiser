// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tableOf } from "./testTable";
import { Visual } from "./visual";

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

// The parts of the Power BI host the visual uses.
function construct() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const eventService = {
    renderingStarted: vi.fn(),
    renderingFinished: vi.fn(),
    renderingFailed: vi.fn(),
  };
  const options = {
    element,
    host: { eventService },
  } as unknown as powerbi.extensibility.visual.VisualConstructorOptions;
  return { element, eventService, visual: new Visual(options) };
}

const updateWith = (dataViews: powerbi.DataView[]) =>
  ({
    dataViews,
  }) as unknown as powerbi.extensibility.visual.VisualUpdateOptions;

afterEach(() => {
  document.body.replaceChildren();
});

describe("Visual", () => {
  it("draws the shell on construction, with no controls", () => {
    const { element } = construct();
    const root = element.querySelector(".vcv-root");
    expect(root).not.toBeNull();
    expect(root?.querySelector(".vcv-header__title")).not.toBeNull();
    expect(root?.querySelector(".vcv-grid")).not.toBeNull();
    expect(root?.querySelector(".vcv-controls")).toBeNull();
  });

  it("draws the cards from the table data view", () => {
    const { element, eventService, visual } = construct();
    const options = updateWith([{ table: tableOf(ROWS) } as powerbi.DataView]);
    visual.update(options);
    expect(element.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(9);
    expect(element.querySelector(".vcv-header__subtitle")?.textContent).toBe(
      "August 2026 · 53 KPIs measured against budget",
    );
    expect(eventService.renderingStarted).toHaveBeenCalledWith(options);
    expect(eventService.renderingFinished).toHaveBeenCalledWith(options);
    expect(eventService.renderingFailed).not.toHaveBeenCalled();
  });

  it("draws an empty chain when there is no data", () => {
    const { element, eventService, visual } = construct();
    visual.update(updateWith([]));
    expect(element.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(0);
    expect(eventService.renderingFinished).toHaveBeenCalled();
    expect(eventService.renderingFailed).not.toHaveBeenCalled();
  });

  it("keeps one visual across updates", () => {
    const { element, visual } = construct();
    const options = updateWith([{ table: tableOf(ROWS) } as powerbi.DataView]);
    visual.update(options);
    visual.update(options);
    expect(element.querySelectorAll(".vcv-root")).toHaveLength(1);
  });

  it("has a formatting model before its first update", () => {
    const { visual } = construct();
    expect(visual.getFormattingModel()).toEqual({ cards: [] });
  });

  it("removes the visual on destroy", () => {
    const { element, visual } = construct();
    visual.destroy();
    expect(element.childElementCount).toBe(0);
  });
});
