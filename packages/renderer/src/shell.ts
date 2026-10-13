import { fontFaceCss } from "./fonts.generated.js";
import { stylesText } from "./styles.js";
import {
  applyTheme,
  resolveTheme,
  type RendererTheme,
  type ThemeOverrides,
} from "./theme.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DOCUMENT_FRAGMENT_NODE = 11;

// The three surface swells, back to front, in a 1440 x 190 viewBox.
const WAVE_VIEW_BOX = "0 0 1440 190";
const WAVE_PATHS = [
  "M0 64 C 160 26, 320 104, 520 66 S 880 24, 1080 66 S 1320 96, 1440 56 V0 H0 Z",
  "M0 104 C 200 66, 380 140, 600 100 S 960 62, 1160 104 S 1360 128, 1440 96 V0 H0 Z",
  "M0 146 C 220 112, 420 176, 660 140 S 1020 108, 1220 146 S 1380 164, 1440 140 V0 H0 Z",
];

export interface ShellOptions {
  theme?: ThemeOverrides;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export interface Shell {
  root: HTMLElement;
  /** Empty slot on the right of the header, for the Year/Period/colour controls. */
  controls: HTMLElement;
  /** Empty grid the cards go into. */
  grid: HTMLElement;
  /** Lays `overrides` over the current theme and re-applies it. */
  setTheme(overrides: ThemeOverrides): void;
  setSubtitle(text: string): void;
  destroy(): void;
}

function el(doc: Document, tag: string, className: string): HTMLElement {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
}

function installStyle(
  target: ParentNode,
  doc: Document,
  marker: string,
  cssText: string,
): void {
  if (target.querySelector(`style[${marker}]`)) return;
  const style = doc.createElement("style");
  style.setAttribute(marker, "");
  style.textContent = cssText;
  target.appendChild(style);
}

/**
 * Adds the renderer stylesheet to `target` (a document's head or a shadow
 * root) unless it is already there.
 */
export function installStyles(target: ParentNode, doc: Document): void {
  installStyle(target, doc, "data-vcv-styles", stylesText);
}

/**
 * Registers the bundled fonts with `doc`. `@font-face` rules are ignored
 * inside shadow roots, so this always goes in the document head.
 */
export function installFonts(doc: Document): void {
  installStyle(doc.head, doc, "data-vcv-fonts", fontFaceCss);
}

function buildOcean(doc: Document, theme: RendererTheme): Node[] {
  const { rays, waveOpacities, bubbles } = theme.ocean;

  const rayNodes = rays.map((ray) => {
    const node = el(doc, "div", "vcv-ocean__ray");
    node.style.setProperty("--vcv-ray-left", ray.left);
    node.style.setProperty("--vcv-ray-width", ray.width);
    node.style.setProperty("--vcv-ray-height", ray.height);
    node.style.setProperty("--vcv-ray-opacity", String(ray.opacity));
    node.style.setProperty("--vcv-ray-blur", ray.blur);
    return node;
  });

  const waves = doc.createElementNS(SVG_NS, "svg");
  waves.setAttribute("class", "vcv-ocean__waves");
  waves.setAttribute("viewBox", WAVE_VIEW_BOX);
  waves.setAttribute("preserveAspectRatio", "none");
  waveOpacities.forEach((opacity, i) => {
    const d = WAVE_PATHS[i % WAVE_PATHS.length];
    if (!d) return;
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "vcv-ocean__wave");
    path.setAttribute("d", d);
    path.style.setProperty("--vcv-wave-opacity", String(opacity));
    waves.appendChild(path);
  });

  const bubbleNodes = bubbles.map((bubble) => {
    const node = el(doc, "div", "vcv-ocean__bubble");
    node.style.setProperty("--vcv-bubble-left", bubble.left);
    node.style.setProperty("--vcv-bubble-top", bubble.top);
    node.style.setProperty("--vcv-bubble-size", bubble.size);
    node.style.setProperty("--vcv-bubble-delay", bubble.delay);
    return node;
  });

  return [...rayNodes, waves, ...bubbleNodes];
}

/**
 * Builds the empty visual inside `container`: ocean background, header and an
 * empty card grid. Installs the stylesheet and the bundled fonts on first use.
 */
export function createShell(
  container: HTMLElement,
  options: ShellOptions = {},
): Shell {
  const doc = container.ownerDocument;
  const scope = container.getRootNode();
  installStyles(
    scope.nodeType === DOCUMENT_FRAGMENT_NODE
      ? (scope as DocumentFragment)
      : doc.head,
    doc,
  );
  installFonts(doc);

  let theme = resolveTheme(options.theme);

  const root = el(doc, "div", "vcv-root");
  applyTheme(root, theme);

  const ocean = el(doc, "div", "vcv-ocean");
  ocean.setAttribute("aria-hidden", "true");
  ocean.replaceChildren(...buildOcean(doc, theme));

  const eyebrow = el(doc, "div", "vcv-header__eyebrow");
  eyebrow.textContent = options.eyebrow ?? "Value chain";
  const title = el(doc, "h1", "vcv-header__title");
  title.textContent = options.title ?? "Business Processes & Scorecard";
  const subtitle = el(doc, "div", "vcv-header__subtitle");
  subtitle.textContent = options.subtitle ?? "";

  const heading = el(doc, "div", "vcv-header__heading");
  heading.append(eyebrow, title, subtitle);
  const controls = el(doc, "div", "vcv-header__controls");
  const header = el(doc, "header", "vcv-header");
  header.append(heading, controls);

  const grid = el(doc, "div", "vcv-grid");
  const content = el(doc, "div", "vcv-content");
  content.append(header, grid);

  root.append(ocean, content);
  container.appendChild(root);

  return {
    root,
    controls,
    grid,
    setTheme(overrides) {
      const previous = theme.ocean;
      theme = resolveTheme(overrides, theme);
      applyTheme(root, theme);
      // Rebuilding restarts the bubble animations, so only do it when the
      // ocean's elements actually changed, not on every colour tweak.
      if (
        theme.ocean.rays !== previous.rays ||
        theme.ocean.waveOpacities !== previous.waveOpacities ||
        theme.ocean.bubbles !== previous.bubbles
      ) {
        ocean.replaceChildren(...buildOcean(doc, theme));
      }
    },
    setSubtitle(text) {
      subtitle.textContent = text;
    },
    destroy() {
      root.remove();
    },
  };
}
