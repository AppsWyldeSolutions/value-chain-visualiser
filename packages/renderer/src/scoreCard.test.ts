// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildModel,
  fromLongRows,
  fromWideRecords,
  type KpiRow,
  type NodeModel,
  type ValueChainVisualiserModel,
} from "@AppsWyldeSolutions/vcv-core";
import { describe, expect, it } from "vitest";
import { cardNode } from "./card.js";
import { createScoreCard, isScoreCard } from "./scoreCard.js";

const SELECTION = { year: 2026, period: "August" };

// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
function readFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures", name), "utf8"),
  );
}

// The same 85 KPIs in the two shapes core ingests.
const MODELS: Record<string, ValueChainVisualiserModel> = {
  "bobos-big-block.json": buildModel(
    fromLongRows(
      (readFixture("bobos-big-block.json") as { records: unknown[] }).records,
    ),
    SELECTION,
  ),
  "main-dc-prototype.json": buildModel(
    fromWideRecords(readFixture("main-dc-prototype.json")),
    SELECTION,
  ),
};

function scoreNode(model: ValueChainVisualiserModel | undefined): NodeModel {
  const node = model?.nodes.find((n) => n.node === "Score Card");
  if (!node) throw new Error("no Score Card node");
  return node;
}

function makeRow(overrides: Partial<KpiRow>): KpiRow {
  return {
    node: "Score Card",
    nodeOrder: 0,
    group: "Primary",
    subGroup: "",
    metric: "Test metric",
    operator: "Equal",
    valueType: "Number",
    symbol: "",
    year: 2026,
    period: "August",
    actual: 1,
    budget: 1,
    ...overrides,
  };
}

function nodeOf(rows: KpiRow[]): NodeModel {
  const node = buildModel(rows, SELECTION).nodes[0];
  if (!node) throw new Error("no node built");
  return node;
}

function texts(root: Element, selector: string): (string | null)[] {
  return Array.from(root.querySelectorAll(selector), (el) => el.textContent);
}

describe("isScoreCard", () => {
  it("picks out the Score Card, and none of the 8 processes", () => {
    for (const model of Object.values(MODELS)) {
      expect(model.nodes.filter(isScoreCard).map((node) => node.node)).toEqual([
        "Score Card",
      ]);
      expect(model.nodes).toHaveLength(9);
    }
  });

  it("goes by a Scorecard sub-group or group, not by the node's name", () => {
    expect(
      isScoreCard(
        nodeOf([
          makeRow({
            node: "Results",
            group: "Satellite",
            subGroup: "Safety Scorecard",
          }),
        ]),
      ),
    ).toBe(true);
    expect(
      isScoreCard(
        nodeOf([makeRow({ node: "Score Card", group: "Satellite" })]),
      ),
    ).toBe(false);
  });
});

describe.each(Object.keys(MODELS))("createScoreCard from %s", (fixture) => {
  const node = scoreNode(MODELS[fixture]);
  const card = createScoreCard(document, node).element;

  it("is a card, marked as the score card and headed as the outcome", () => {
    expect(card.classList.contains("vcv-card")).toBe(true);
    expect(card.classList.contains("vcv-card--score")).toBe(true);
    expect(card.querySelector(".vcv-card__eyebrow")?.textContent).toBe(
      "Outcome",
    );
    const title = card.querySelector(".vcv-card__title");
    expect(title?.textContent).toBe("Score Card");
    expect(card.getAttribute("aria-labelledby")).toBe(title?.id);
  });

  it("shows no satellite row", () => {
    expect(card.querySelector(".vcv-kpi-row--satellite")).toBeNull();
    expect(card.querySelector(".vcv-kpi--satellite")).toBeNull();
    expect(texts(card, ".vcv-kpi-row__label")).not.toContain("Satellite KPIs");
  });

  it("has the primary row, then a panel for each sub-group", () => {
    expect(texts(card, ".vcv-kpi-row__label")).toEqual([
      "Primary KPIs",
      "Financial Scorecard",
      "People & Culture Scorecard",
      "Production Performance Scorecard",
    ]);
    const rows = Array.from(card.querySelectorAll(".vcv-kpi-row"));
    expect(rows[0]?.classList.contains("vcv-kpi-row--primary")).toBe(true);
    expect(rows[0]?.querySelectorAll(".vcv-kpi--primary")).toHaveLength(3);

    const panels = Array.from(
      card.querySelectorAll(".vcv-card__panels > .vcv-kpi-row--panel"),
    );
    expect(panels).toHaveLength(3);
    for (const panel of panels) {
      expect(panel.querySelectorAll(".vcv-kpi--panel")).toHaveLength(3);
    }
    expect(card.querySelectorAll(".vcv-sphere")).toHaveLength(12);
  });

  it("fills the primary row and the panels from the fixture", () => {
    const primary = card.querySelector(".vcv-kpi-row--primary");
    expect(primary && texts(primary, ".vcv-kpi__percent")).toEqual([
      "101%",
      "100%",
      "100%",
    ]);
    expect(primary && texts(primary, ".vcv-kpi__value")).toEqual([
      "$15,683M / $15,492M",
      "$2.45M / $2.44M",
      "90% / 90%",
    ]);

    const financial = card.querySelector(".vcv-kpi-row--panel");
    expect(financial && texts(financial, ".vcv-kpi__label")).toEqual([
      "Management Fee Revenue > RF Plan ($M)",
      "Cost-to-Income Ratio < 60%",
      "Average Fee Margin > 43 bps",
    ]);
    expect(financial && texts(financial, ".vcv-kpi__value")).toEqual([
      "$5.53M / $5.55M",
      "59.7% / 60%",
      "42.6 / 43 bps",
    ]);
    expect(
      financial &&
        Array.from(financial.querySelectorAll(".vcv-sphere"), (sphere) =>
          sphere.classList.contains("vcv-sphere--met"),
        ),
    ).toEqual([false, true, false]);
  });

  it("counts the primary and panel KPIs on target", () => {
    expect(card.querySelector(".vcv-card__pill")?.textContent).toBe(
      "8 of 12 on target",
    );
  });

  it("remembers its node, so an arrow can end on it", () => {
    expect(cardNode(card)).toBe(node);
  });
});

describe("createScoreCard", () => {
  it("draws the same card from either fixture", () => {
    const [long, wide] = Object.values(MODELS).map(
      (model) => createScoreCard(document, scoreNode(model)).element,
    );
    expect(long?.textContent).toBe(wide?.textContent);
    expect(texts(long as Element, ".vcv-kpi")).toEqual(
      texts(wide as Element, ".vcv-kpi"),
    );
  });

  it("leaves out satellites that belong to no sub-group", () => {
    const card = createScoreCard(
      document,
      nodeOf([
        makeRow({ metric: "Headline" }),
        makeRow({
          group: "Satellite",
          subGroup: "Safety Scorecard",
          metric: "Grouped",
        }),
        makeRow({
          group: "Satellite",
          metric: "Loose",
          actual: 0,
          budget: 5,
        }),
      ]),
    ).element;
    expect(texts(card, ".vcv-kpi-row__label")).toEqual([
      "Primary KPI",
      "Safety Scorecard",
    ]);
    expect(texts(card, ".vcv-kpi__label")).toEqual(["Headline", "Grouped"]);
    // The loose satellite missed its target, but it is not shown or counted.
    expect(card.querySelector(".vcv-card__pill")?.textContent).toBe(
      "2 of 2 on target",
    );
  });

  it("makes a panel from the older shape, where the group names it", () => {
    const card = createScoreCard(
      document,
      nodeOf([
        makeRow({ metric: "Headline" }),
        makeRow({
          group: "Financial Scorecard" as KpiRow["group"],
          metric: "Old shape",
        }),
      ]),
    ).element;
    expect(texts(card, ".vcv-kpi-row__label")).toEqual([
      "Primary KPI",
      "Financial Scorecard",
    ]);
    expect(
      card.querySelectorAll(".vcv-kpi-row--panel .vcv-kpi--panel"),
    ).toHaveLength(1);
  });

  it("keeps panels in the order their sub-groups first appear", () => {
    const card = createScoreCard(
      document,
      nodeOf([
        makeRow({ group: "Satellite", subGroup: "B Scorecard", metric: "b1" }),
        makeRow({ group: "Satellite", subGroup: "A Scorecard", metric: "a1" }),
        makeRow({ group: "Satellite", subGroup: "B Scorecard", metric: "b2" }),
      ]),
    ).element;
    expect(texts(card, ".vcv-kpi-row__label")).toEqual([
      "B Scorecard",
      "A Scorecard",
    ]);
    expect(texts(card, ".vcv-kpi__label")).toEqual(["b1", "b2", "a1"]);
  });

  it("writes names as text, never as markup", () => {
    const card = createScoreCard(
      document,
      nodeOf([
        makeRow({
          node: "<img src=x onerror=alert(1)>",
          group: "Satellite",
          subGroup: "<b>Bold</b> Scorecard",
        }),
      ]),
    ).element;
    expect(card.querySelector("img")).toBeNull();
    expect(card.querySelector("b")).toBeNull();
    expect(card.querySelector(".vcv-card__title")?.textContent).toBe(
      "<img src=x onerror=alert(1)>",
    );
    expect(texts(card, ".vcv-kpi-row__label")).toEqual([
      "<b>Bold</b> Scorecard",
    ]);
  });
});
