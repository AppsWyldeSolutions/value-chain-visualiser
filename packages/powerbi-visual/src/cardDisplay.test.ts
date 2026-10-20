// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it } from "vitest";
import { cardDisplayFrom } from "./format";
import { CARD_DISPLAYS, VisualFormattingSettingsModel } from "./settings";
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

afterEach(() => {
  document.body.replaceChildren();
});

describe("Display → Card display", () => {
  it("offers Compact and Full, Compact by default", () => {
    expect(CARD_DISPLAYS.map((item) => item.value)).toEqual([
      "compact",
      "full",
    ]);
    expect(cardDisplayFrom(new VisualFormattingSettingsModel())).toBe(
      "compact",
    );
  });

  it("is declared in capabilities.json with the same choices", () => {
    const capabilities = JSON.parse(
      readFileSync(path.resolve(__dirname, "../capabilities.json"), "utf8"),
    ) as {
      objects: Record<
        string,
        { properties: Record<string, { type: Record<string, unknown> }> }
      >;
    };
    expect(
      capabilities.objects.display!.properties.cardDisplay!.type.enumeration,
    ).toEqual(CARD_DISPLAYS);
  });

  it("draws compact bars by default and full cards when chosen, in place", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const visual = new Visual({
      element,
      host: testHost().host,
    } as powerbi.extensibility.visual.VisualConstructorOptions);
    const update = (objects: powerbi.DataViewObjects) =>
      visual.update({
        dataViews: [
          { table: tableOf(ROWS), metadata: { columns: [], objects } },
        ],
      } as unknown as powerbi.extensibility.visual.VisualUpdateOptions);

    update({});
    const root = element.querySelector(".vcv-root");
    expect(element.querySelectorAll(".vcv-grid .vcv-bar")).toHaveLength(9);

    update({ display: { cardDisplay: "full" } });
    expect(element.querySelectorAll(".vcv-grid > .vcv-card")).toHaveLength(9);
    expect(element.querySelectorAll(".vcv-grid .vcv-bar")).toHaveLength(0);
    expect(element.querySelector(".vcv-root")).toBe(root);

    update({});
    expect(element.querySelectorAll(".vcv-grid .vcv-bar")).toHaveLength(9);
  });
});
