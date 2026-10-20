import type { EvaluatedKpi } from "@appswyldesolutions/vcv-core";
import { createSphere } from "./sphere.js";

/** Which row a KPI sits in; it decides the sphere and text sizes. */
export type KpiVariant = "primary" | "satellite" | "panel";

function line(doc: Document, className: string, text: string): HTMLElement {
  const node = doc.createElement("div");
  node.className = className;
  node.textContent = text;
  return node;
}

// The KPI each element was built from, for hosts that react to clicks.
const kpiElements = new WeakMap<Element, EvaluatedKpi>();

/** The KPI a `.vcv-kpi` element shows, if `createKpi` built it. */
/** Records the KPI an element shows, for `kpiOf`. */
export function bindKpi(element: Element, kpi: EvaluatedKpi): void {
  kpiElements.set(element, kpi);
}

export function kpiOf(element: Element): EvaluatedKpi | undefined {
  return kpiElements.get(element);
}

/** The full detail of one KPI, one fact per line, for its hover tooltip. */
export function kpiTooltip(kpi: EvaluatedKpi): string {
  const { row } = kpi;
  const lines = [row.metric, `${row.period} ${row.year}`];
  if (!kpi.hasData) {
    lines.push("No data for this period");
    return lines.join("\n");
  }
  const lessThan = row.operator === "LessThan";
  lines.push(
    `Actual: ${kpi.actual}`,
    `Budget: ${kpi.budget}`,
    `Rule: actual at or ${lessThan ? "under" : "above"} budget`,
    kpi.met ? "Target met" : lessThan ? "Over budget" : "Below budget",
  );
  return lines.join("\n");
}

/**
 * Builds one KPI: its sphere with the percentage, metric name and
 * actual / budget figures underneath. A `tag` is a short heading above the
 * sphere, used for a transfer point's category.
 */
export function createKpi(
  doc: Document,
  kpi: EvaluatedKpi,
  variant: KpiVariant,
  tag?: string,
): HTMLElement {
  const element = doc.createElement("div");
  element.className = `vcv-kpi vcv-kpi--${variant}`;
  element.setAttribute("title", kpiTooltip(kpi));
  if (tag !== undefined) {
    element.appendChild(line(doc, "vcv-kpi__tag", tag));
  }
  element.append(
    // No label: the text below already says everything the sphere shows.
    createSphere(doc, kpi).element,
    line(doc, "vcv-kpi__percent", kpi.label),
    line(doc, "vcv-kpi__label", kpi.row.metric),
    line(doc, "vcv-kpi__value", kpi.pair),
  );
  kpiElements.set(element, kpi);
  return element;
}
