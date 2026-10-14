import { describe, expect, it } from "vitest";
import { connectorShape, type Box } from "./connectorShape.js";

// The prototype's numbers: 424px cards, a 56px column gap, a 64px row gap.
const METRICS = {
  rowAnchor: 187,
  startGap: 2,
  headLength: 14,
  headWidth: 16,
  cornerRadius: 10,
  hitPadding: 16,
};

function card(left: number, top: number, width = 424, height = 608): Box {
  return { left, top, width, height };
}

describe("connectorShape", () => {
  it("runs across the gap to the next card in the same row", () => {
    const shape = connectorShape(card(0, 0), card(480, 0), METRICS);
    expect(shape).toMatchObject({
      kind: "across",
      line: "M426 187 H466",
      head: "466,179 480,187 466,195",
      tip: { x: 480, y: 187 },
    });
  });

  it("keeps the across arrow on both cards when they are short", () => {
    const shape = connectorShape(
      card(0, 0, 424, 200),
      card(480, 0, 424, 200),
      METRICS,
    );
    expect(shape?.kind).toBe("across");
    expect(shape?.tip).toEqual({ x: 480, y: 100 });
  });

  it("turns back to the first card of the next row", () => {
    const shape = connectorShape(card(960, 0), card(0, 672), METRICS);
    expect(shape).toMatchObject({
      kind: "turn",
      line: "M1172 610 V630 Q1172 640 1162 640 H222 Q212 640 212 650 V658",
      head: "204,658 220,658 212,672",
      tip: { x: 212, y: 672 },
    });
  });

  it("turns the other way when the next card is to the right", () => {
    const shape = connectorShape(card(0, 0), card(480, 672), METRICS);
    expect(shape?.kind).toBe("turn");
    expect(shape?.line).toBe(
      "M212 610 V630 Q212 640 222 640 H682 Q692 640 692 650 V658",
    );
    expect(shape?.tip).toEqual({ x: 692, y: 672 });
  });

  it("drops straight down to the card below in a single column", () => {
    const shape = connectorShape(card(0, 0), card(0, 672), METRICS);
    expect(shape).toMatchObject({
      kind: "down",
      line: "M212 610 V658",
      head: "204,658 220,658 212,672",
      tip: { x: 212, y: 672 },
    });
  });

  it("drops straight down onto a card that spans the row below", () => {
    const shape = connectorShape(card(480, 0), card(0, 672, 1384), METRICS);
    expect(shape).toMatchObject({
      kind: "down",
      line: "M692 610 V658",
      head: "684,658 700,658 692,672",
      tip: { x: 692, y: 672 },
    });
  });

  it("tightens the corners of a turn when the row gap is small", () => {
    const shape = connectorShape(card(480, 0), card(0, 648), METRICS);
    // 40px gap: the bend sits half-way (628) and only 6px remain between it
    // and the arrow head, so the corner radius shrinks from 10 to 6.
    expect(shape?.line).toBe(
      "M692 610 V622 Q692 628 686 628 H218 Q212 628 212 634 V634",
    );
    expect(shape?.tip).toEqual({ x: 212, y: 648 });
  });

  it("gives each arrow a hit area around its whole run", () => {
    // Across: the column gap, the arrow head's 16px plus 16px either side.
    expect(connectorShape(card(0, 0), card(480, 0), METRICS)?.hit).toEqual({
      left: 424,
      top: 163,
      width: 56,
      height: 48,
    });
    // Down: the row gap, 48px wide about the arrow.
    expect(connectorShape(card(0, 0), card(0, 672), METRICS)?.hit).toEqual({
      left: 188,
      top: 608,
      width: 48,
      height: 64,
    });
    // Turn: the row gap, from one end of the run to the other.
    expect(connectorShape(card(960, 0), card(0, 672), METRICS)?.hit).toEqual({
      left: 188,
      top: 608,
      width: 1008,
      height: 64,
    });
  });

  it("draws nothing between cards that overlap or run backwards", () => {
    expect(connectorShape(card(0, 0), card(0, 0), METRICS)).toBeNull();
    expect(connectorShape(card(0, 0), card(200, 100), METRICS)).toBeNull();
    expect(connectorShape(card(480, 0), card(0, 0), METRICS)).toBeNull();
    expect(connectorShape(card(0, 672), card(0, 0), METRICS)).toBeNull();
  });

  it("draws nothing for a card that has no size yet", () => {
    expect(connectorShape(card(0, 0, 0, 0), card(480, 0), METRICS)).toBeNull();
  });
});
