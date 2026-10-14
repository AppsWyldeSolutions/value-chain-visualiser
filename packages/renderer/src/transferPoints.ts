import type { NodeModel } from "@appswyldesolutions/vcv-core";
import { nodeShortName, onTargetText } from "./card.js";
import type { Box } from "./connectorShape.js";
import { createKpi } from "./kpi.js";
import { popoverPosition } from "./popoverPosition.js";
import { defaultTheme } from "./theme.js";

export interface TransferPoints {
  /** The hover and focus target laid over an arrow; it holds the popover. */
  element: HTMLElement;
  /** Moves the target over the arrow's hit area, in grid coordinates. */
  place(hit: Box): void;
  destroy(): void;
}

function el(doc: Document, tag: string, className: string): HTMLElement {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
}

function text(doc: Document, className: string, content: string): HTMLElement {
  const node = el(doc, "div", className);
  node.textContent = content;
  return node;
}

function intersect(a: Box, b: Box): Box {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function buildPopover(
  doc: Document,
  from: NodeModel,
  toName: string,
): HTMLElement {
  const heading = el(doc, "div", "vcv-popover__heading");
  heading.append(
    text(doc, "vcv-popover__eyebrow", "Transfer points"),
    text(doc, "vcv-popover__title", `${nodeShortName(from.node)} → ${toName}`),
  );
  const header = el(doc, "div", "vcv-popover__header");
  header.append(
    heading,
    text(doc, "vcv-popover__pill", onTargetText(from.transferPoints)),
  );

  const items = el(doc, "div", "vcv-popover__items");
  items.append(
    ...from.transferPoints.map((kpi) =>
      createKpi(doc, kpi, "satellite", kpi.row.subGroup),
    ),
  );

  const panel = el(doc, "div", "vcv-popover__panel");
  panel.append(header, items);
  // The popover is the panel plus clear padding above and below it, so the
  // pointer can cross from the arrow to the panel without leaving the target.
  const popover = el(doc, "div", "vcv-popover");
  popover.hidden = true;
  popover.appendChild(panel);
  return popover;
}

/**
 * Builds the transfer points handed from one link to the next: a focusable
 * target to lay over the arrow between them, and the popover it shows on
 * hover or keyboard focus. Escape closes the popover until the target is
 * entered again, and it is kept inside the viewport and the visual.
 */
export function createTransferPoints(
  doc: Document,
  from: NodeModel,
  to: NodeModel | undefined,
): TransferPoints {
  const view = doc.defaultView;
  const toName = to ? nodeShortName(to.node) : "next link";

  const trigger = el(doc, "div", "vcv-transfer");
  trigger.setAttribute("tabindex", "0");
  trigger.setAttribute("role", "group");
  trigger.setAttribute(
    "aria-label",
    `Transfer points from ${nodeShortName(from.node)} to ${toName}`,
  );
  const popover = buildPopover(doc, from, toName);
  trigger.appendChild(popover);

  let hovered = false;
  let focused = false;
  let dismissed = false;
  let open = false;

  function reposition(): void {
    if (!open || !view) return;
    // Measure from a known spot, then move to where it should be.
    popover.style.left = "0px";
    popover.style.top = "0px";
    const anchor = trigger.getBoundingClientRect();
    const size = popover.getBoundingClientRect();
    // Undo any CSS transform a host applies: style offsets are unscaled.
    const scale =
      trigger.offsetWidth > 0 ? anchor.width / trigger.offsetWidth : 1;

    const viewport: Box = {
      left: 0,
      top: 0,
      width: doc.documentElement.clientWidth,
      height: doc.documentElement.clientHeight,
    };
    // The visual clips its own overflow, so stay inside it as well.
    const root = trigger.closest(".vcv-root");
    const bounds = root
      ? intersect(viewport, root.getBoundingClientRect())
      : viewport;

    const themed = parseFloat(
      view.getComputedStyle(trigger).getPropertyValue("--vcv-popover-margin"),
    );
    const margin = Number.isFinite(themed)
      ? themed
      : parseFloat(defaultTheme.popover.margin);

    const position = popoverPosition(anchor, size, bounds, margin * scale);
    popover.style.left = `${(position.left - anchor.left) / scale}px`;
    popover.style.top = `${(position.top - anchor.top) / scale}px`;
    popover.setAttribute("data-placement", position.placement);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    dismissed = true;
    sync();
  }

  function sync(): void {
    const next = (hovered || focused) && !dismissed;
    if (next === open) return;
    open = next;
    popover.hidden = !open;
    trigger.classList.toggle("vcv-transfer--open", open);
    if (open) {
      // On the document, so Escape works when the popover is only hovered.
      doc.addEventListener("keydown", onKeydown);
      doc.addEventListener("scroll", reposition, true);
      view?.addEventListener("resize", reposition);
      reposition();
    } else {
      doc.removeEventListener("keydown", onKeydown);
      doc.removeEventListener("scroll", reposition, true);
      view?.removeEventListener("resize", reposition);
    }
  }

  // Entering again, by pointer or by focus, undoes an Escape.
  trigger.addEventListener("mouseenter", () => {
    hovered = true;
    dismissed = false;
    sync();
  });
  trigger.addEventListener("mouseleave", () => {
    hovered = false;
    if (!focused) dismissed = false;
    sync();
  });
  trigger.addEventListener("focusin", () => {
    focused = true;
    dismissed = false;
    sync();
  });
  trigger.addEventListener("focusout", () => {
    focused = false;
    if (!hovered) dismissed = false;
    sync();
  });

  return {
    element: trigger,
    place(hit) {
      trigger.style.left = `${hit.left}px`;
      trigger.style.top = `${hit.top}px`;
      trigger.style.width = `${hit.width}px`;
      trigger.style.height = `${hit.height}px`;
      reposition();
    },
    destroy() {
      hovered = false;
      focused = false;
      sync();
      trigger.remove();
    },
  };
}
