/** A card's position and size, in the grid's own pixel coordinates. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * How far down the box an arrow leaving it sits, in place of the metrics'
   * rowAnchor (a compact bar's measured primary sphere).
   */
  anchor?: number;
}

/** The theme's `connector` sizes, as pixel numbers. */
export interface ConnectorMetrics {
  /** How far down a card an arrow to its right-hand neighbour sits. */
  rowAnchor: number;
  /** Space between the card an arrow leaves and the start of its line. */
  startGap: number;
  headLength: number;
  headWidth: number;
  cornerRadius: number;
  /** How far the hover and focus target extends either side of an arrow. */
  hitPadding: number;
}

/**
 * - `across`: to the next card in the same row.
 * - `down`: straight down to the card below.
 * - `turn`: down, along the row gap and down again to a card in another column.
 */
export type ConnectorKind = "across" | "down" | "turn";

export interface ConnectorShape {
  kind: ConnectorKind;
  /** Path data for the dashed line. */
  line: string;
  /** Polygon points for the arrow head. */
  head: string;
  /** Where the arrow head touches the next card's edge. */
  tip: { x: number; y: number };
  /** The area around the arrow that responds to hover and focus. */
  hit: Box;
}

// Half a pixel of slack when comparing edges that layout rounded differently.
const EPSILON = 0.5;

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Works out the arrow from one card to the next from where layout put them.
 * Returns null when there is no sensible arrow: a card has no size yet, the
 * cards overlap, or the next card comes before this one.
 */
export function connectorShape(
  from: Box,
  to: Box,
  metrics: ConnectorMetrics,
): ConnectorShape | null {
  if (from.width <= 0 || from.height <= 0 || to.width <= 0 || to.height <= 0) {
    return null;
  }
  const { rowAnchor, startGap, headLength, headWidth, cornerRadius } = metrics;
  // Either side of the arrow's own width.
  const reach = headWidth / 2 + metrics.hitPadding;
  const fromRight = from.left + from.width;
  const fromBottom = from.top + from.height;
  const toRight = to.left + to.width;
  const toBottom = to.top + to.height;
  const halfHead = headWidth / 2;

  const sameRow = to.top < fromBottom && toBottom > from.top;
  if (sameRow) {
    if (to.left < fromRight) return null;
    // On the anchor line, but never off the end of a short card.
    const anchored =
      from.top + (from.anchor ?? Math.min(rowAnchor, from.height / 2));
    const y = Math.max(
      to.top + halfHead,
      Math.min(anchored, toBottom - halfHead),
    );
    const tipX = to.left;
    const baseX = tipX - headLength;
    return {
      kind: "across",
      line: `M${n(fromRight + startGap)} ${n(y)} H${n(baseX)}`,
      head: `${n(baseX)},${n(y - halfHead)} ${n(tipX)},${n(y)} ${n(baseX)},${n(y + halfHead)}`,
      tip: { x: n(tipX), y: n(y) },
      hit: {
        left: n(fromRight),
        top: n(y - reach),
        width: n(to.left - fromRight),
        height: n(reach * 2),
      },
    };
  }

  if (to.top < fromBottom) return null;
  const startX = from.left + from.width / 2;
  const startY = fromBottom + startGap;
  // A card that covers this one's whole width (the same column, or one that
  // spans the row) is met straight on; any other is met at its centre.
  const covers =
    to.left <= from.left + EPSILON && toRight >= fromRight - EPSILON;
  const endX = covers ? startX : to.left + to.width / 2;
  const tipY = to.top;
  const baseY = tipY - headLength;
  const head = `${n(endX - halfHead)},${n(baseY)} ${n(endX + halfHead)},${n(baseY)} ${n(endX)},${n(tipY)}`;
  const tip = { x: n(endX), y: n(tipY) };
  // The row gap, as wide as the arrow's whole run.
  const hit = {
    left: n(Math.min(startX, endX) - reach),
    top: n(fromBottom),
    width: n(Math.abs(endX - startX) + reach * 2),
    height: n(to.top - fromBottom),
  };

  if (Math.abs(endX - startX) < EPSILON) {
    return {
      kind: "down",
      line: `M${n(startX)} ${n(startY)} V${n(baseY)}`,
      head,
      tip,
      hit,
    };
  }

  // Bend half-way down the row gap, with corners no rounder than fit.
  const midY = (fromBottom + to.top) / 2;
  const radius = Math.max(
    0,
    Math.min(
      cornerRadius,
      Math.abs(endX - startX) / 2,
      midY - startY,
      baseY - midY,
    ),
  );
  const step = endX > startX ? radius : -radius;
  return {
    kind: "turn",
    line:
      `M${n(startX)} ${n(startY)} V${n(midY - radius)} ` +
      `Q${n(startX)} ${n(midY)} ${n(startX + step)} ${n(midY)} ` +
      `H${n(endX - step)} ` +
      `Q${n(endX)} ${n(midY)} ${n(endX)} ${n(midY + radius)} V${n(baseY)}`,
    head,
    tip,
    hit,
  };
}
