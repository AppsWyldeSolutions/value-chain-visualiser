// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildModel,
  fromLongRows,
  type KpiRow,
  type NodeModel,
} from "@AppsWyldeSolutions/vcv-core";
import { describe, expect, it } from "vitest";
import { createCard, nodeHeading } from "./card.js";

// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
const fixture = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../fixtures/bobos-big-block.json"),
    "utf8",
  ),
) as { records: unknown[] };
const model = buildModel(fromLongRows(fixture.records), {
  year: 2026,
  period: "August",
});

function nodeNamed(name: string): NodeModel {
  const node = model.nodes.find((n) => n.node === name);
  if (!node) throw new Error(`no node ${name}`);
  return node;
}

function makeRow(overrides: Partial<KpiRow>): KpiRow {
  return {
    node: "Process 1 - Intake",
    nodeOrder: 0,
    group: "Primary",
    subGroup: "",
    metric: "Test metric",
    operator: "Equal",
    valueType: "Number",
    symbol: "",
    year: 2026,
    period: "August",
    actual: null,
    budget: null,
    ...overrides,
  };
}

function nodeOf(rows: KpiRow[]): NodeModel {
  const node = buildModel(rows, { year: 2026, period: "August" }).nodes[0];
  if (!node) throw new Error("no node built");
  return node;
}

function texts(root: Element, selector: string): (string | null)[] {
  return Array.from(root.querySelectorAll(selector), (el) => el.textContent);
}

describe("nodeHeading", () => {
  it("splits a business unit and process code from the name", () => {
    expect(nodeHeading("BU1 - P2: Product Development")).toEqual({
      eyebrow: "BU1 · P2",
      title: "Product Development",
    });
  });

  it("splits a numbered process from its name, whatever the dash", () => {
    expect(nodeHeading("Process 1 – Client Intake")).toEqual({
      eyebrow: "Process 1",
      title: "Client Intake",
    });
  });

  it("falls back to a generic eyebrow and the whole name", () => {
    expect(nodeHeading("Fund Administration")).toEqual({
      eyebrow: "Link",
      title: "Fund Administration",
    });
  });
});

describe("createCard", () => {
  const card = createCard(
    document,
    nodeNamed("BU1 - P2: Product Development"),
  ).element;

  it("writes the header and counts the KPIs on target", () => {
    expect(card.classList.contains("vcv-card")).toBe(true);
    expect(card.querySelector(".vcv-card__eyebrow")?.textContent).toBe(
      "BU1 · P2",
    );
    expect(card.querySelector(".vcv-card__title")?.textContent).toBe(
      "Product Development",
    );
    // 1 primary + 4 satellites; the 4 transfer points are not counted here.
    expect(card.querySelector(".vcv-card__pill")?.textContent).toBe(
      "3 of 5 on target",
    );
  });

  it("names the card after its title for assistive tech", () => {
    const title = card.querySelector(".vcv-card__title");
    expect(title?.id).toBeTruthy();
    expect(card.getAttribute("aria-labelledby")).toBe(title?.id);
  });

  it("lays out a primary row, then a satellite row", () => {
    expect(texts(card, ".vcv-kpi-row__label")).toEqual([
      "Primary KPI",
      "Satellite KPIs",
    ]);
    const rows = card.querySelectorAll(".vcv-kpi-row");
    expect(rows[0]?.classList.contains("vcv-kpi-row--primary")).toBe(true);
    expect(rows[1]?.classList.contains("vcv-kpi-row--satellite")).toBe(true);
    expect(rows[0]?.querySelectorAll(".vcv-kpi--primary")).toHaveLength(1);
    expect(rows[1]?.querySelectorAll(".vcv-kpi--satellite")).toHaveLength(4);
    expect(card.querySelectorAll(".vcv-kpi")).toHaveLength(5);
  });

  it("shows each KPI's sphere, percentage, name and actual / budget", () => {
    expect(texts(card, ".vcv-kpi__percent")).toEqual([
      "100%",
      "102%",
      "0%",
      "84%",
      "107%",
    ]);
    expect(texts(card, ".vcv-kpi__label")).toEqual([
      "Product Launch Milestones Delivered > RF Plan",
      "PDS / Prospectus Lodged on Time > 95%",
      "New Funds Launched > RF Plan",
      "ASIC Filing Rework Rate < 5%",
      "Fund Structuring Cycle Time < 45 days",
    ]);
    expect(texts(card, ".vcv-kpi__value")).toEqual([
      "10 / 10",
      "97% / 95%",
      "0 / 1",
      "4.2% / 5%",
      "48 / 45 days",
    ]);
    const spheres = Array.from(card.querySelectorAll(".vcv-kpi .vcv-sphere"));
    expect(spheres).toHaveLength(5);
    expect(
      spheres.map((sphere) => sphere.classList.contains("vcv-sphere--met")),
    ).toEqual([true, true, false, true, false]);
    // The text beside each sphere already says what it shows.
    for (const sphere of spheres) {
      expect(sphere.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("gives each KPI a tooltip with the full detail", () => {
    const tips = Array.from(card.querySelectorAll(".vcv-kpi"), (kpi) =>
      kpi.getAttribute("title"),
    );
    expect(tips[1]).toBe(
      [
        "PDS / Prospectus Lodged on Time > 95%",
        "August 2026",
        "Actual: 97%",
        "Budget: 95%",
        "Rule: actual at or above budget",
        "Target met",
      ].join("\n"),
    );
    expect(tips[2]).toBe(
      [
        "New Funds Launched > RF Plan",
        "August 2026",
        "Actual: 0",
        "Budget: 1",
        "Rule: actual at or above budget",
        "Below budget",
      ].join("\n"),
    );
    expect(tips[4]).toBe(
      [
        "Fund Structuring Cycle Time < 45 days",
        "August 2026",
        "Actual: 48 days",
        "Budget: 45 days",
        "Rule: actual at or under budget",
        "Over budget",
      ].join("\n"),
    );
  });

  it("builds a card for every process in the fixture", () => {
    const processes = model.nodes.filter((node) => node.node !== "Score Card");
    expect(processes).toHaveLength(8);
    for (const node of processes) {
      const element = createCard(document, node).element;
      expect(element.querySelectorAll(".vcv-kpi--primary")).toHaveLength(
        node.primary.length,
      );
      expect(element.querySelectorAll(".vcv-kpi--satellite")).toHaveLength(
        node.satellite.length,
      );
    }
  });

  it("pluralises the primary row label", () => {
    const element = createCard(
      document,
      nodeOf([
        makeRow({ metric: "A", actual: 1, budget: 1 }),
        makeRow({ metric: "B", actual: 1, budget: 2 }),
      ]),
    ).element;
    expect(texts(element, ".vcv-kpi-row__label")).toEqual(["Primary KPIs"]);
    expect(element.querySelector(".vcv-card__pill")?.textContent).toBe(
      "1 of 2 on target",
    );
  });

  it("leaves out a row that has no KPIs", () => {
    const element = createCard(
      document,
      nodeOf([makeRow({ group: "Satellite", actual: 5, budget: 4 })]),
    ).element;
    expect(texts(element, ".vcv-kpi-row__label")).toEqual(["Satellite KPIs"]);
  });

  it("shows KPIs without data as empty and leaves them out of the count", () => {
    const element = createCard(
      document,
      nodeOf([
        makeRow({ metric: "Measured", actual: 9, budget: 10 }),
        makeRow({ group: "Satellite", metric: "Unmeasured" }),
      ]),
    ).element;
    expect(element.querySelector(".vcv-card__pill")?.textContent).toBe(
      "0 of 1 on target",
    );
    const unmeasured = element.querySelector(".vcv-kpi--satellite");
    expect(unmeasured?.querySelector(".vcv-kpi__percent")?.textContent).toBe(
      "No data",
    );
    expect(unmeasured?.querySelector(".vcv-kpi__value")?.textContent).toBe("");
    expect(
      unmeasured
        ?.querySelector(".vcv-sphere")
        ?.classList.contains("vcv-sphere--no-data"),
    ).toBe(true);
    expect(unmeasured?.getAttribute("title")).toBe(
      "Unmeasured\nAugust 2026\nNo data for this period",
    );
  });

  it("says so when no KPI on the card has data", () => {
    const element = createCard(document, nodeOf([makeRow({})])).element;
    expect(element.querySelector(".vcv-card__pill")?.textContent).toBe(
      "No data",
    );
  });

  it("writes names as text, never as markup", () => {
    const element = createCard(
      document,
      nodeOf([
        makeRow({
          node: "BU9 - P9: <img src=x onerror=alert(1)>",
          metric: "<b>bold</b>",
          actual: 1,
          budget: 1,
        }),
      ]),
    ).element;
    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector("b")).toBeNull();
    expect(element.querySelector(".vcv-card__title")?.textContent).toBe(
      "<img src=x onerror=alert(1)>",
    );
    expect(element.querySelector(".vcv-kpi__label")?.textContent).toBe(
      "<b>bold</b>",
    );
  });

  it("gives every card its own title id", () => {
    const node = nodeNamed("BU1 - P2: Product Development");
    const a = createCard(document, node).element;
    const b = createCard(document, node).element;
    expect(a.querySelector(".vcv-card__title")?.id).not.toBe(
      b.querySelector(".vcv-card__title")?.id,
    );
  });
});
