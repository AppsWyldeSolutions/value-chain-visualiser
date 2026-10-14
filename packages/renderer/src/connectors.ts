import { cardNode } from "./card.js";
import {
  connectorShape,
  type Box,
  type ConnectorMetrics,
} from "./connectorShape.js";
import { defaultTheme } from "./theme.js";
import { createTransferPoints, type TransferPoints } from "./transferPoints.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// The custom property each metric is read from on the grid.
const METRIC_VARS: Record<keyof ConnectorMetrics, string> = {
  rowAnchor: "--vcv-connector-row-anchor",
  startGap: "--vcv-connector-start-gap",
  headLength: "--vcv-connector-head-length",
  headWidth: "--vcv-connector-head-width",
  cornerRadius: "--vcv-connector-corner-radius",
  hitPadding: "--vcv-connector-hit-padding",
};

export interface Connectors {
  /** The overlay the arrows are drawn in. */
  element: SVGSVGElement;
  /** Re-measures the cards and redraws. Called automatically on resize. */
  update(): void;
  destroy(): void;
}

/** The transfer points shown for one arrow, and the card it points at. */
interface Transfer {
  to: Element;
  points: TransferPoints;
}

/**
 * Reads the arrow sizes from the theme's custom properties, which must be
 * pixel lengths. A property that is missing falls back to the default theme.
 */
function readMetrics(grid: HTMLElement): ConnectorMetrics {
  const style = grid.ownerDocument.defaultView?.getComputedStyle(grid);
  const metrics = {} as ConnectorMetrics;
  for (const key of Object.keys(METRIC_VARS) as (keyof ConnectorMetrics)[]) {
    const value = parseFloat(style?.getPropertyValue(METRIC_VARS[key]) ?? "");
    metrics[key] = Number.isFinite(value)
      ? value
      : parseFloat(defaultTheme.connector[key]);
  }
  return metrics;
}

function cardsOf(grid: HTMLElement): Element[] {
  return Array.from(grid.children).filter((child) =>
    child.classList.contains("vcv-card"),
  );
}

/**
 * Draws the value chain's arrows over `grid`: one from each card to the next,
 * in document order. The grid's columns come from CSS, so the arrows are
 * worked out from where the cards actually are, and again whenever the grid
 * or a card changes size or cards are added or removed.
 *
 * An arrow leaving a card built by `createCard` whose node has transfer
 * points also gets a hover and focus target that shows them in a popover.
 */
export function createConnectors(grid: HTMLElement): Connectors {
  const doc = grid.ownerDocument;
  const view = doc.defaultView;

  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "vcv-connectors");
  svg.setAttribute("aria-hidden", "true");
  // The arrows ignore the pointer; this layer holds their hit targets.
  const layer = doc.createElement("div");
  layer.className = "vcv-transfers";
  grid.append(svg, layer);

  // Keyed by the card an arrow leaves, so a target (and an open popover or
  // keyboard focus on it) survives every redraw.
  const transfers = new Map<Element, Transfer>();

  function update(): void {
    const origin = grid.getBoundingClientRect();
    // Undo any CSS transform on an ancestor (hosts may scale the visual):
    // the overlay's own coordinates are unscaled.
    const scale = grid.offsetWidth > 0 ? origin.width / grid.offsetWidth : 1;
    const cards = cardsOf(grid);
    const boxes: Box[] = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        left: (rect.left - origin.left) / scale,
        top: (rect.top - origin.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      };
    });

    const metrics = readMetrics(grid);
    const groups: SVGElement[] = [];
    const live = new Set<Element>();
    boxes.forEach((from, i) => {
      const to = boxes[i + 1];
      const fromCard = cards[i];
      const toCard = cards[i + 1];
      const shape = to && connectorShape(from, to, metrics);
      if (!shape || !fromCard || !toCard) return;

      const line = doc.createElementNS(SVG_NS, "path");
      line.setAttribute("class", "vcv-connector__line vcv-flow");
      line.setAttribute("d", shape.line);
      const head = doc.createElementNS(SVG_NS, "polygon");
      head.setAttribute("class", "vcv-connector__head");
      head.setAttribute("points", shape.head);

      const group = doc.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `vcv-connector vcv-connector--${shape.kind}`);
      group.setAttribute("data-kind", shape.kind);
      group.append(line, head);
      groups.push(group);

      const node = cardNode(fromCard);
      if (!node || node.transferPoints.length === 0) return;
      let transfer = transfers.get(fromCard);
      if (transfer && transfer.to !== toCard) {
        // The arrow now points at a different card: the popover names it.
        transfer.points.destroy();
        transfer = undefined;
      }
      if (!transfer) {
        transfer = {
          to: toCard,
          points: createTransferPoints(doc, node, cardNode(toCard)),
        };
        transfers.set(fromCard, transfer);
      }
      // Keep the targets in chain order for the keyboard, moving one only
      // when it is out of place (moving a focused element would blur it).
      const target = transfer.points.element;
      const current = layer.children[live.size];
      if (current !== target) layer.insertBefore(target, current ?? null);
      transfer.points.place(shape.hit);
      live.add(fromCard);
    });
    svg.replaceChildren(...groups);

    for (const [card, transfer] of transfers) {
      if (live.has(card)) continue;
      transfer.points.destroy();
      transfers.delete(card);
    }
  }

  const resizeObserver = view?.ResizeObserver
    ? new view.ResizeObserver(update)
    : null;
  function observeSizes(): void {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver.observe(grid);
    for (const card of cardsOf(grid)) resizeObserver.observe(card);
  }
  // Only the grid's direct children are watched, so redrawing the arrows
  // and their targets inside the two overlays does not trigger this again.
  const mutationObserver = view?.MutationObserver
    ? new view.MutationObserver(() => {
        observeSizes();
        update();
      })
    : null;
  mutationObserver?.observe(grid, { childList: true });

  observeSizes();
  update();

  return {
    element: svg,
    update,
    destroy() {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      for (const transfer of transfers.values()) transfer.points.destroy();
      transfers.clear();
      svg.remove();
      layer.remove();
    },
  };
}
