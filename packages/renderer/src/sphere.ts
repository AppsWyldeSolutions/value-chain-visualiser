/**
 * What a sphere shows. Core's `Evaluation` (and so `EvaluatedKpi`) already
 * has this shape, so a KPI from `buildModel` can be passed straight in.
 */
export interface SphereState {
  /** Fill height, 0 (empty) to 1 (budget, a full sphere). */
  level: number;
  /** On target: drawn in the fill colour. Otherwise the shortfall colour. */
  met: boolean;
  /** False draws an empty, dashed sphere whatever the other two say. */
  hasData: boolean;
}

export interface SphereOptions {
  /** CSS length for the diameter. Defaults to the theme's `sphere.size`. */
  size?: string;
  /** Accessible name. Without one the sphere is hidden from assistive tech. */
  label?: string;
}

export interface Sphere {
  element: HTMLElement;
  update(state: SphereState): void;
}

function part(doc: Document, className: string): HTMLElement {
  const node = doc.createElement("div");
  node.className = className;
  return node;
}

function applyState(element: HTMLElement, state: SphereState): void {
  const level = state.hasData && state.level > 0 ? Math.min(1, state.level) : 0;
  const { classList } = element;
  classList.toggle("vcv-sphere--met", state.hasData && state.met);
  classList.toggle("vcv-sphere--missed", state.hasData && !state.met);
  classList.toggle("vcv-sphere--no-data", !state.hasData);
  // Only a partly filled sphere has a liquid surface to draw.
  classList.toggle("vcv-sphere--partial", level > 0 && level < 1);
  element.style.setProperty(
    "--vcv-sphere-level",
    `${(level * 100).toFixed(1)}%`,
  );
}

/**
 * Builds one glass sphere: the shell with its ring, the liquid and its
 * meniscus, and two highlights. Colours come from the theme through the
 * stylesheet, so a theme change recolours existing spheres without an update.
 */
export function createSphere(
  doc: Document,
  state: SphereState,
  options: SphereOptions = {},
): Sphere {
  const element = part(doc, "vcv-sphere");
  if (options.size) {
    element.style.setProperty("--vcv-sphere-size", options.size);
  }
  if (options.label) {
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", options.label);
  } else {
    element.setAttribute("aria-hidden", "true");
  }

  const liquid = part(doc, "vcv-sphere__liquid");
  liquid.appendChild(part(doc, "vcv-sphere__meniscus"));
  element.append(
    liquid,
    part(doc, "vcv-sphere__highlight"),
    part(doc, "vcv-sphere__highlight vcv-sphere__highlight--low"),
  );

  applyState(element, state);
  return {
    element,
    update(next) {
      applyState(element, next);
    },
  };
}
