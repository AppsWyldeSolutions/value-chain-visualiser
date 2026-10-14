import type { EvaluatedKpi, NodeModel } from "@AppsWyldeSolutions/vcv-core";
import { createKpi, type KpiVariant } from "./kpi.js";

export interface Card {
  element: HTMLElement;
}

export interface NodeHeading {
  eyebrow: string;
  title: string;
}

let nextTitleId = 0;

// The node each card was built from, so the connectors can show the
// transfer points handed from one card to the next.
const cardNodes = new WeakMap<Element, NodeModel>();

/** The node a card element was built from, if `createCard` built it. */
export function cardNode(card: Element): NodeModel | undefined {
  return cardNodes.get(card);
}

/**
 * Splits a node name into the small line above a card's title and the title:
 * "BU1 - P2: Product Development" -> "BU1 · P2" / "Product Development",
 * "Process 1 – Intake" -> "Process 1" / "Intake". Other names are kept whole.
 */
export function nodeHeading(node: string): NodeHeading {
  const unit = node.match(/^(\w+)\s*[–—-]\s*(\w+)\s*:\s*(.+)$/);
  if (unit?.[1] && unit[2] && unit[3]) {
    return { eyebrow: `${unit[1]} · ${unit[2]}`, title: unit[3] };
  }
  const process = node.match(/^(Process\s+\d+)\s*[–—-]\s*(.+)$/);
  if (process?.[1] && process[2]) {
    return { eyebrow: process[1], title: process[2] };
  }
  return { eyebrow: "Link", title: node };
}

/**
 * The short way to refer to a node in running text: its code when the name
 * has one ("BU1 · P2"), otherwise the whole name ("Score Card").
 */
export function nodeShortName(node: string): string {
  const { eyebrow, title } = nodeHeading(node);
  return title === node ? node : eyebrow;
}

/** "3 of 5 on target", counting only KPIs that have data. */
export function onTargetText(kpis: EvaluatedKpi[]): string {
  const measured = kpis.filter((kpi) => kpi.hasData);
  if (measured.length === 0) return "No data";
  const met = measured.filter((kpi) => kpi.met).length;
  return `${met} of ${measured.length} on target`;
}

function el(doc: Document, tag: string, className: string): HTMLElement {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
}

function createRow(
  doc: Document,
  label: string,
  kpis: EvaluatedKpi[],
  variant: KpiVariant,
): HTMLElement {
  const heading = el(doc, "div", "vcv-kpi-row__label");
  heading.textContent = label;
  const items = el(doc, "div", "vcv-kpi-row__items");
  items.append(...kpis.map((kpi) => createKpi(doc, kpi, variant)));
  const row = el(doc, "div", `vcv-kpi-row vcv-kpi-row--${variant}`);
  row.append(heading, items);
  return row;
}

/**
 * Builds the glass card for one process: header with the on-target count,
 * the primary KPI row and the satellite KPI row. Transfer points are not
 * shown on the card; they belong to the connector's popover.
 */
export function createCard(doc: Document, node: NodeModel): Card {
  const { eyebrow, title } = nodeHeading(node.node);

  const eyebrowEl = el(doc, "div", "vcv-card__eyebrow");
  eyebrowEl.textContent = eyebrow;
  const titleEl = el(doc, "h2", "vcv-card__title");
  titleEl.id = `vcv-card-title-${++nextTitleId}`;
  titleEl.textContent = title;
  const heading = el(doc, "div", "vcv-card__heading");
  heading.append(eyebrowEl, titleEl);

  const pill = el(doc, "div", "vcv-card__pill");
  pill.textContent = onTargetText([...node.primary, ...node.satellite]);

  const header = el(doc, "div", "vcv-card__header");
  header.append(heading, pill);

  const rows = el(doc, "div", "vcv-card__rows");
  if (node.primary.length > 0) {
    const label = node.primary.length > 1 ? "Primary KPIs" : "Primary KPI";
    rows.appendChild(createRow(doc, label, node.primary, "primary"));
  }
  if (node.satellite.length > 0) {
    rows.appendChild(
      createRow(doc, "Satellite KPIs", node.satellite, "satellite"),
    );
  }

  const element = el(doc, "article", "vcv-card");
  element.setAttribute("aria-labelledby", titleEl.id);
  element.append(header, rows);
  cardNodes.set(element, node);
  return { element };
}
