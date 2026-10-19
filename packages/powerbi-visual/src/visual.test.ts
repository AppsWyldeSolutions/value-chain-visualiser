// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import {
  DEFAULT_HEADING,
  defaultTheme,
  OCEAN_PRESETS,
} from "@appswyldesolutions/vcv-renderer";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it } from "vitest";
import { testHost } from "./testHost";
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

function construct() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const { host, eventService } = testHost();
  const options = {
    element,
    host,
  } as powerbi.extensibility.visual.VisualConstructorOptions;
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

  it("says what is wrong when Power BI gives it no options", () => {
    expect(() => new Visual()).toThrow(
      "Visual needs the constructor options Power BI passes",
    );
  });

  it("has the Colours, Background and Display cards before its first update", () => {
    const { visual } = construct();
    const model = visual.getFormattingModel();
    expect(model.cards.map((card) => card.uid)).toEqual([
      "colours-card",
      "background-card",
      "display-card",
      "header-card",
    ]);
  });

  describe("format pane", () => {
    const formatted = (objects: powerbi.DataViewObjects) =>
      updateWith([
        { table: tableOf(ROWS), metadata: { columns: [], objects } },
      ] as powerbi.DataView[]);
    const css = (element: HTMLElement, name: string) =>
      element
        .querySelector<HTMLElement>(".vcv-root")!
        .style.getPropertyValue(name);

    it("restyles the same visual on each update: no reload", () => {
      const { element, visual } = construct();
      visual.update(formatted({}));
      const root = element.querySelector(".vcv-root");
      expect(css(element, "--vcv-fill-color")).toBe(defaultTheme.fillColor);

      visual.update(
        formatted({
          colours: {
            fillColor: { solid: { color: "#2f9e44" } },
            shortfallColor: { solid: { color: "#e03131" } },
          },
          background: { preset: "lagoon", opacity: 40 },
          display: { sphereSize: 150 },
        }),
      );
      expect(element.querySelector(".vcv-root")).toBe(root);
      expect(css(element, "--vcv-fill-color")).toBe("#2f9e44");
      expect(css(element, "--vcv-shortfall-color")).toBe("#e03131");
      expect(css(element, "--vcv-ocean-base")).toBe(OCEAN_PRESETS.lagoon.base);
      expect(css(element, "--vcv-ocean-opacity")).toBe("0.4");
      expect(css(element, "--vcv-card-primary-sphere-size")).toBe("198px");
    });

    it("sets the header's text and visibility from the Header card", () => {
      const { element, visual } = construct();
      visual.update(formatted({}));
      const root = element.querySelector(".vcv-root")!;
      visual.update(
        formatted({
          header: {
            eyebrow: "Wylde",
            title: "Operations chain",
            showSubtitle: false,
          },
        }),
      );
      expect(element.querySelector(".vcv-root")).toBe(root);
      expect(element.querySelector(".vcv-header__eyebrow")?.textContent).toBe(
        "Wylde",
      );
      expect(element.querySelector(".vcv-header__title")?.textContent).toBe(
        "Operations chain",
      );
      expect(root.classList.contains("vcv-root--no-subtitle")).toBe(true);
      visual.update(formatted({ header: { showHeader: false } }));
      expect(root.classList.contains("vcv-root--no-heading")).toBe(true);
      visual.update(formatted({}));
      expect(element.querySelector(".vcv-header__title")?.textContent).toBe(
        DEFAULT_HEADING.title,
      );
      expect(root.classList.contains("vcv-root--no-heading")).toBe(false);
      expect(root.classList.contains("vcv-root--no-subtitle")).toBe(false);
    });

    it("goes back to the defaults when a setting is reset", () => {
      const { element, visual } = construct();
      visual.update(
        formatted({
          background: { preset: "none" },
          display: { sphereSize: 50 },
        }),
      );
      visual.update(formatted({}));
      expect(css(element, "--vcv-ocean-base")).toBe(OCEAN_PRESETS.ocean.base);
      expect(css(element, "--vcv-card-primary-sphere-size")).toBe(
        defaultTheme.card.primarySphereSize,
      );
    });

    it("shows the format pane the values in use", () => {
      const { visual } = construct();
      visual.update(formatted({ display: { showTransferPoints: false } }));
      const display = visual
        .getFormattingModel()
        .cards.find((card) => card.uid === "display-card")!;
      const toggle = JSON.stringify(display);
      expect(toggle).toContain('"showTransferPoints"');
      expect(toggle).toMatch(/"value":false/);
    });
  });

  it("removes the visual on destroy", () => {
    const { element, visual } = construct();
    visual.destroy();
    expect(element.childElementCount).toBe(0);
  });
});
