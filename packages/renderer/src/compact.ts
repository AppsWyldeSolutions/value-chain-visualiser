import type { EvaluatedKpi, NodeModel } from "@appswyldesolutions/vcv-core";
import { bindCardNode, nodeHeading, onTargetText } from "./card.js";
import { bindKpi } from "./kpi.js";
import { shownKpis } from "./nodeKpis.js";
import { isScoreCard, panelsOf } from "./scoreCard.js";
import { createSphere } from "./sphere.js";

/** How the chain draws its links: compact bars (the default) or full cards. */
export type CardDisplay = "compact" | "full";

/** A compact bar and the slot it sits in, which is the grid's cell. */
export interface Bar {
  /** The grid cell: a size container, so the bar scales with its width. */
  slot: HTMLElement;
  /** The bar itself: a button that opens the link's full card. */
  bar: HTMLElement;
}

function el(doc: Document, tag: string, className: string): HTMLElement {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
}

/** What a sphere's tooltip and accessible name say. */
export function sphereLabel(kpi: EvaluatedKpi): string {
  const { metric } = kpi.row;
  return kpi.hasData
    ? `${metric} — ${kpi.pair} (${kpi.label})`
    : `${metric} — No data for this period`;
}

/** One KPI in a bar: its sphere and percentage. */
function indicator(doc: Document, kpi: EvaluatedKpi): HTMLElement {
  const element = el(doc, "div", "vcv-bar__kpi");
  element.append(
    createSphere(doc, kpi, { label: sphereLabel(kpi) }).element,
    Object.assign(el(doc, "span", "vcv-bar__pct"), {
      textContent: kpi.label,
    }),
  );
  bindKpi(element, kpi);
  return element;
}

/** KPIs as one two-column grid: the spheres, and their percentages. */
function list(doc: Document, kpis: EvaluatedKpi[]): HTMLElement {
  const element = el(doc, "div", "vcv-bar__list");
  element.append(...kpis.map((kpi) => indicator(doc, kpi)));
  return element;
}

function divider(doc: Document): HTMLElement {
  const element = el(doc, "div", "vcv-bar__divider");
  element.setAttribute("aria-hidden", "true");
  return element;
}

/**
 * Builds a link's compact bar: its code, its primary KPI's sphere and
 * percentage, a divider and its satellites in one aligned grid. The Score
 * Card's bar has its primary KPIs as small spheres on top, then each
 * sub-group's, divided. The bar is a button: the visual opens the link's
 * full card from it.
 */
export function createBar(doc: Document, node: NodeModel): Bar {
  const score = isScoreCard(node);
  const slot = el(doc, "div", "vcv-slot");
  const bar = el(doc, "article", score ? "vcv-bar vcv-bar--score" : "vcv-bar");
  const heading = nodeHeading(node.node);
  const name = score ? "Score Card" : heading.title;

  bar.setAttribute("role", "button");
  bar.setAttribute("tabindex", "0");
  bar.setAttribute("aria-haspopup", "dialog");
  bar.setAttribute("aria-expanded", "false");
  const lead = node.primary[0];
  bar.setAttribute(
    "aria-label",
    [
      name,
      lead && !score ? lead.label : undefined,
      onTargetText(shownKpis(node)),
    ]
      .filter(Boolean)
      .join(", ") + ". Press Enter for details.",
  );

  const code = el(doc, "div", "vcv-bar__code");
  code.textContent = score ? "Score Card" : heading.eyebrow;
  bar.appendChild(code);

  if (score) {
    const groups = [node.primary, ...panelsOf(node).values()].filter(
      (kpis) => kpis.length > 0,
    );
    groups.forEach((kpis, i) => {
      if (i > 0) bar.appendChild(divider(doc));
      bar.appendChild(list(doc, kpis));
    });
  } else {
    const primary = el(doc, "div", "vcv-bar__primary");
    primary.append(...node.primary.map((kpi) => indicator(doc, kpi)));
    bar.appendChild(primary);
    if (node.satellite.length > 0) {
      bar.append(divider(doc), list(doc, node.satellite));
    }
  }

  bindCardNode(bar, node);
  slot.appendChild(bar);
  return { slot, bar };
}

/**
 * Where a bar's outgoing arrow sits: the centre of its primary sphere (the
 * first sphere on the Score Card), from the bar's top, in unscaled pixels.
 */
export function barAnchor(bar: Element): number | undefined {
  const sphere =
    bar.querySelector(".vcv-bar__primary .vcv-sphere") ??
    bar.querySelector(".vcv-sphere");
  if (!sphere) return undefined;
  const barRect = bar.getBoundingClientRect();
  const rect = sphere.getBoundingClientRect();
  const element = bar as HTMLElement;
  const scale =
    element.offsetHeight > 0 ? barRect.height / element.offsetHeight : 1;
  return (rect.top - barRect.top + rect.height / 2) / scale;
}
