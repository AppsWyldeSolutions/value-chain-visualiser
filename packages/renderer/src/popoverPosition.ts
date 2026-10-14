import type { Box } from "./connectorShape.js";

export interface PopoverPosition {
  left: number;
  top: number;
  /** Which side of the anchor the popover ended up on. */
  placement: "below" | "above";
}

/**
 * Places a popover of `size` against `anchor`, all in the same coordinates
 * as `bounds` (normally the viewport): centred below the anchor if it fits,
 * above it if not, and always at least `margin` inside the bounds. When
 * neither side has room it takes the roomier one and slides over the anchor.
 */
export function popoverPosition(
  anchor: Box,
  size: { width: number; height: number },
  bounds: Box,
  margin: number,
): PopoverPosition {
  const minLeft = bounds.left + margin;
  const maxLeft = bounds.left + bounds.width - margin - size.width;
  const centred = anchor.left + anchor.width / 2 - size.width / 2;
  // Too wide to fit at all: keep its start, the heading, in view.
  const left = Math.max(minLeft, Math.min(centred, maxLeft));

  const minTop = bounds.top + margin;
  const maxTop = bounds.top + bounds.height - margin - size.height;
  const anchorBottom = anchor.top + anchor.height;
  const roomBelow = bounds.top + bounds.height - margin - anchorBottom;
  const roomAbove = anchor.top - minTop;

  const below =
    roomBelow >= size.height ||
    (roomAbove < size.height && roomBelow >= roomAbove);
  const wanted = below ? anchorBottom : anchor.top - size.height;
  return {
    left,
    top: Math.max(minTop, Math.min(wanted, maxTop)),
    placement: below ? "below" : "above",
  };
}
