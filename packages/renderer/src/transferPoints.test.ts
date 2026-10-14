// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildModel,
  fromLongRows,
  type NodeModel,
} from "@AppsWyldeSolutions/vcv-core";
import { afterEach, describe, expect, it } from "vitest";
import { createCard } from "./card.js";
import { createConnectors } from "./connectors.js";

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

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// jsdom does no layout, so each element is told where it is.
function place(element: Element, rect: Rect): void {
  element.getBoundingClientRect = () =>
    ({
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => rect,
    }) as DOMRect;
}

function nodeAt(index: number): NodeModel {
  const node = model.nodes[index];
  if (!node) throw new Error(`no node ${index}`);
  return node;
}

// Three cards in one row of a grid at the page origin.
function makeChain(nodes: NodeModel[]) {
  const grid = document.createElement("div");
  grid.className = "vcv-grid";
  place(grid, { left: 0, top: 0, width: 1384, height: 608 });
  document.body.appendChild(grid);
  const cards = nodes.map((node, i) => {
    const card = createCard(document, node).element;
    place(card, { left: i * 480, top: 0, width: 424, height: 608 });
    grid.appendChild(card);
    return card;
  });
  const connectors = createConnectors(grid);
  const triggers = () =>
    Array.from(grid.querySelectorAll<HTMLElement>(".vcv-transfer"));
  return { grid, cards, connectors, triggers };
}

function popoverOf(trigger: HTMLElement | undefined): HTMLElement {
  const popover = trigger?.querySelector<HTMLElement>(".vcv-popover");
  if (!popover) throw new Error("trigger has no popover");
  return popover;
}

function texts(root: Element, selector: string): (string | null)[] {
  return Array.from(root.querySelectorAll(selector), (el) => el.textContent);
}

function fire(target: EventTarget, type: string, init?: KeyboardEventInit) {
  const event =
    type === "keydown"
      ? new KeyboardEvent(type, { bubbles: true, ...init })
      : new Event(type, { bubbles: type.startsWith("focus") });
  target.dispatchEvent(event);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("transfer points popover", () => {
  it("adds a focusable trigger over each arrow, named for its two links", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1), nodeAt(2)]);
    expect(triggers()).toHaveLength(2);
    const [first, second] = triggers();
    expect(first?.getAttribute("tabindex")).toBe("0");
    expect(first?.getAttribute("role")).toBe("group");
    expect(first?.getAttribute("aria-label")).toBe(
      "Transfer points from BU1 · P2 to BU2 · P3",
    );
    expect(second?.getAttribute("aria-label")).toBe(
      "Transfer points from BU2 · P3 to BU3 · P1",
    );
  });

  it("covers the arrow with the trigger", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const style = triggers()[0]?.style;
    // The across arrow spans the 56px gap at y = 187; the hit area is the
    // arrow head's 16px plus 16px either side.
    expect(style?.left).toBe("424px");
    expect(style?.width).toBe("56px");
    expect(style?.top).toBe("163px");
    expect(style?.height).toBe("48px");
  });

  it("fills the popover with the link's transfer points", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const popover = popoverOf(triggers()[0]);
    expect(popover.querySelector(".vcv-popover__eyebrow")?.textContent).toBe(
      "Transfer points",
    );
    expect(popover.querySelector(".vcv-popover__title")?.textContent).toBe(
      "BU1 · P2 → BU2 · P3",
    );
    expect(popover.querySelector(".vcv-popover__pill")?.textContent).toBe(
      "3 of 4 on target",
    );
    expect(texts(popover, ".vcv-kpi__tag")).toEqual([
      "CornerStones",
      "Unit Rate",
      "Contractual Compliance",
      "Labour Management",
    ]);
    expect(popover.querySelectorAll(".vcv-kpi .vcv-sphere")).toHaveLength(4);
    expect(texts(popover, ".vcv-kpi__percent")).toEqual([
      "106%",
      "109%",
      "100%",
      "100%",
    ]);
    expect(texts(popover, ".vcv-kpi__value")).toEqual([
      "95% / 90%",
      "$432k / $398k",
      "100% / 100%",
      "95% / 95%",
    ]);
    expect(texts(popover, ".vcv-kpi__label")[0]).toBe(
      "90% of Corner Stones achieved by Process",
    );
  });

  it("names a link that has no code by its title", () => {
    const scoreCard = model.nodes.find((node) => node.node === "Score Card");
    if (!scoreCard) throw new Error("no Score Card");
    const { triggers } = makeChain([nodeAt(7), scoreCard]);
    expect(triggers()[0]?.getAttribute("aria-label")).toBe(
      "Transfer points from BU5 · P3 to Score Card",
    );
    expect(
      popoverOf(triggers()[0]).querySelector(".vcv-popover__title")
        ?.textContent,
    ).toBe("BU5 · P3 → Score Card");
  });

  it("adds no trigger for a link without transfer points", () => {
    const bare = { ...nodeAt(0), transferPoints: [] };
    const { triggers, connectors } = makeChain([bare, nodeAt(1)]);
    expect(connectors.element.querySelectorAll(".vcv-connector")).toHaveLength(
      1,
    );
    expect(triggers()).toHaveLength(0);
  });

  it("opens on hover and closes when the pointer leaves", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const [trigger] = triggers();
    if (!trigger) throw new Error("no trigger");
    const popover = popoverOf(trigger);
    expect(popover.hidden).toBe(true);

    fire(trigger, "mouseenter");
    expect(popover.hidden).toBe(false);
    expect(trigger.classList.contains("vcv-transfer--open")).toBe(true);

    fire(trigger, "mouseleave");
    expect(popover.hidden).toBe(true);
    expect(trigger.classList.contains("vcv-transfer--open")).toBe(false);
  });

  it("opens on keyboard focus and closes on blur", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const [trigger] = triggers();
    if (!trigger) throw new Error("no trigger");
    const popover = popoverOf(trigger);

    fire(trigger, "focusin");
    expect(popover.hidden).toBe(false);
    fire(trigger, "focusout");
    expect(popover.hidden).toBe(true);
  });

  it("stays open while it is still hovered or still focused", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const [trigger] = triggers();
    if (!trigger) throw new Error("no trigger");
    const popover = popoverOf(trigger);

    fire(trigger, "mouseenter");
    fire(trigger, "focusin");
    fire(trigger, "mouseleave");
    expect(popover.hidden).toBe(false);
    fire(trigger, "focusout");
    expect(popover.hidden).toBe(true);
  });

  it("closes on Escape, wherever the key lands, until it is entered again", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const [trigger] = triggers();
    if (!trigger) throw new Error("no trigger");
    const popover = popoverOf(trigger);

    fire(trigger, "mouseenter");
    fire(document.body, "keydown", { key: "Escape" });
    expect(popover.hidden).toBe(true);

    // Still hovered: other keys and focus changes elsewhere do not reopen it.
    fire(document.body, "keydown", { key: "a" });
    expect(popover.hidden).toBe(true);

    fire(trigger, "mouseleave");
    fire(trigger, "mouseenter");
    expect(popover.hidden).toBe(false);

    fire(trigger, "focusin");
    fire(trigger, "keydown", { key: "Escape" });
    expect(popover.hidden).toBe(true);
  });

  it("ignores other keys while open", () => {
    const { triggers } = makeChain([nodeAt(0), nodeAt(1)]);
    const [trigger] = triggers();
    if (!trigger) throw new Error("no trigger");
    fire(trigger, "focusin");
    fire(trigger, "keydown", { key: "Enter" });
    expect(popoverOf(trigger).hidden).toBe(false);
  });

  it("keeps the same trigger, and its open state, across a redraw", () => {
    const { triggers, connectors, cards } = makeChain([nodeAt(0), nodeAt(1)]);
    const [trigger] = triggers();
    if (!trigger) throw new Error("no trigger");
    fire(trigger, "focusin");

    // One column: the second card drops below the first.
    const second = cards[1];
    if (!second) throw new Error("no second card");
    place(second, { left: 0, top: 672, width: 424, height: 608 });
    connectors.update();

    expect(triggers()).toEqual([trigger]);
    expect(popoverOf(trigger).hidden).toBe(false);
    // Now over the down arrow in the 64px row gap.
    expect(trigger.style.top).toBe("608px");
    expect(trigger.style.height).toBe("64px");
    expect(trigger.style.left).toBe("188px");
    expect(trigger.style.width).toBe("48px");
  });

  it("drops the trigger when its arrow goes", () => {
    const { triggers, connectors, cards } = makeChain([nodeAt(0), nodeAt(1)]);
    cards[1]?.remove();
    connectors.update();
    expect(triggers()).toHaveLength(0);
  });

  it("removes the triggers on destroy", () => {
    const { grid, connectors } = makeChain([nodeAt(0), nodeAt(1)]);
    connectors.destroy();
    expect(grid.querySelector(".vcv-transfers")).toBeNull();
    expect(grid.querySelector(".vcv-transfer")).toBeNull();
  });
});
