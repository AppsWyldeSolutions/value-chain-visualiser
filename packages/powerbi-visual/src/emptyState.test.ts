// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows, type KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it } from "vitest";
import { ROLES } from "./rows";
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
  const stub = testHost();
  const visual = new Visual({
    element,
    host: stub.host,
  } as powerbi.extensibility.visual.VisualConstructorOptions);
  const update = (dataViews: unknown[]) => {
    const options = {
      dataViews,
    } as unknown as powerbi.extensibility.visual.VisualUpdateOptions;
    visual.update(options);
    return options;
  };
  return { element, visual, update, ...stub };
}

/** The report's table with one field taken out of its well. */
const without = (role: keyof KpiRow) => [
  {
    table: tableOf(
      ROWS,
      ROLES.filter((r) => r !== role),
    ),
    metadata: { columns: [] },
  },
];
const full = () => [{ table: tableOf(ROWS), metadata: { columns: [] } }];

const message = (element: Element) =>
  element.querySelector(".vcv-empty")?.textContent ?? null;
const cards = (element: Element) =>
  element.querySelectorAll(".vcv-grid > .vcv-card").length;

afterEach(() => {
  document.body.replaceChildren();
});

describe("empty state", () => {
  it("asks for a required field taken out of the report, not an error", () => {
    const { element, update, eventService } = construct();
    update(without("budget"));
    expect(message(element)).toBe("Add Budget");
    expect(cards(element)).toBe(0);
    expect(eventService.renderingFailed).not.toHaveBeenCalled();
    expect(eventService.renderingFinished).toHaveBeenCalledTimes(1);
  });

  it("names every required field before any is added", () => {
    const { element, update } = construct();
    update([]);
    expect(message(element)).toBe(
      "Add Node, Group, Metric, Year, Period, Actual and Budget",
    );
    update([{ metadata: { columns: [] } }]);
    expect(message(element)).toBe(
      "Add Node, Group, Metric, Year, Period, Actual and Budget",
    );
  });

  it("draws the chain again once the field is back", () => {
    const { element, update } = construct();
    update(without("metric"));
    expect(message(element)).toBe("Add Metric");
    update(full());
    expect(message(element)).toBeNull();
    expect(cards(element)).toBe(9);
  });

  it("is not shown while an optional field is missing", () => {
    const { element, update } = construct();
    update(without("symbol"));
    expect(message(element)).toBeNull();
    expect(cards(element)).toBe(9);
  });
});

describe("rendering events", () => {
  const order = (eventService: ReturnType<typeof testHost>["eventService"]) =>
    [
      ...eventService.renderingStarted.mock.invocationCallOrder.map(
        (n) => [n, "started"] as const,
      ),
      ...eventService.renderingFinished.mock.invocationCallOrder.map(
        (n) => [n, "finished"] as const,
      ),
      ...eventService.renderingFailed.mock.invocationCallOrder.map(
        (n) => [n, "failed"] as const,
      ),
    ]
      .sort(([a], [b]) => a - b)
      .map(([, event]) => event);

  it("wrap every update: with data, empty, or without a data view", () => {
    const { update, eventService } = construct();
    const first = update(full());
    const second = update(without("node"));
    const third = update([]);
    expect(order(eventService)).toEqual([
      "started",
      "finished",
      "started",
      "finished",
      "started",
      "finished",
    ]);
    expect(eventService.renderingStarted.mock.calls.map(([o]) => o)).toEqual([
      first,
      second,
      third,
    ]);
    expect(eventService.renderingFinished.mock.calls.map(([o]) => o)).toEqual([
      first,
      second,
      third,
    ]);
  });

  it("report a failure, still in a started/failed pair", () => {
    const { update, eventService } = construct();
    const broken = {
      get table(): never {
        throw new Error("no table today");
      },
      metadata: { columns: [] },
    };
    const options = update([broken]);
    expect(order(eventService)).toEqual(["started", "failed"]);
    expect(eventService.renderingFailed).toHaveBeenCalledWith(
      options,
      "Error: no table today",
    );
  });
});
