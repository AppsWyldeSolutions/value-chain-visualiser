import {
  connectorShape,
  type Box,
  type ConnectorMetrics,
} from "./connectorShape.js";
import { defaultTheme } from "./theme.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// The custom property each metric is read from on the grid.
const METRIC_VARS: Record<keyof ConnectorMetrics, string> = {
  rowAnchor: "--vcv-connector-row-anchor",
  startGap: "--vcv-connector-start-gap",
  headLength: "--vcv-connector-head-length",
  headWidth: "--vcv-connector-head-width",
  cornerRadius: "--vcv-connector-corner-radius",
};

export interface Connectors {
  /** The overlay the arrows are drawn in. */
  element: SVGSVGElement;
  /** Re-measures the cards and redraws. Called automatically on resize. */
  update(): void;
  destroy(): void;
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
 */
export function createConnectors(grid: HTMLElement): Connectors {
  const doc = grid.ownerDocument;
  const view = doc.defaultView;

  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "vcv-connectors");
  svg.setAttribute("aria-hidden", "true");
  grid.appendChild(svg);

  function update(): void {
    const origin = grid.getBoundingClientRect();
    // Undo any CSS transform on an ancestor (hosts may scale the visual):
    // the overlay's own coordinates are unscaled.
    const scale = grid.offsetWidth > 0 ? origin.width / grid.offsetWidth : 1;
    const boxes: Box[] = cardsOf(grid).map((card) => {
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
    boxes.forEach((from, i) => {
      const to = boxes[i + 1];
      const shape = to && connectorShape(from, to, metrics);
      if (!shape) return;

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
    });
    svg.replaceChildren(...groups);
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
  // inside the overlay does not trigger this again.
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
      svg.remove();
    },
  };
}
