import {
  buildModel,
  type EvaluatedKpi,
  type KpiRow,
  type NodeModel,
} from "@appswyldesolutions/vcv-core";
import { cardNode, createCard } from "./card.js";
import { barAnchor, createBar, type CardDisplay } from "./compact.js";
import { createConnectors } from "./connectors.js";
import { createControls, type ControlsValue } from "./controls.js";
import { highContrastTheme, type HighContrastColors } from "./highContrast.js";
import { kpiOf } from "./kpi.js";
import { drawnKpis, shownKpis } from "./nodeKpis.js";
import { createScoreCard, isScoreCard } from "./scoreCard.js";
import type { Box } from "./connectorShape.js";
import { createShell } from "./shell.js";
import { defaultTheme, resolveTheme, type ThemeOverrides } from "./theme.js";
import type { TooltipHandlers, TooltipTarget } from "./tooltip.js";

export const PERIODS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface Selection {
  year: number;
  period: string;
}

/** The viewer's choices: the selection and the two colours. */
export type VisualState = ControlsValue;

export interface VisualOptions {
  rows: KpiRow[];
  /** Defaults to `defaultSelection(rows)`. */
  selection?: Selection;
  theme?: ThemeOverrides;
  eyebrow?: string;
  title?: string;
  /**
   * Draw the Year, Period and colour controls in the header. Defaults to
   * true. A host that owns those choices itself (Power BI's filters and
   * format pane) passes false and sets them through `setSelection` and
   * `setTheme`.
   */
  showControls?: boolean;
  /** Called when the viewer changes a control, with the whole new state. */
  onChange?(state: VisualState): void;
  /**
   * Called when a sphere is clicked, with the KPI it shows. `multi` is true
   * for a ctrl-click (cmd-click on a Mac): add to the selection rather than
   * replace it. When given, the spheres show a pointer.
   */
  onSelect?(kpi: EvaluatedKpi, click: SelectClick): void;
  /**
   * Called when a click lands away from every sphere (and the header
   * controls): a host clears its selection.
   */
  onDeselect?(): void;
  /**
   * The host's own tooltips, called as the pointer moves over KPIs and
   * cards. When given, the native title tooltips are left out, so the two do
   * not both show.
   */
  tooltip?: TooltipHandlers;
  /**
   * How the links are drawn: "compact" (the default), one small bar each in
   * a single row that scales with the visual's width, whose full card opens
   * in a popup when the bar is clicked; or "full", every full card in a grid
   * that wraps.
   */
  cardDisplay?: CardDisplay;
}

/** What Visual.setHeader can change. */
export interface HeaderOptions {
  eyebrow?: string;
  title?: string;
  show?: boolean;
  showSubtitle?: boolean;
}

/** How a sphere was clicked. */
export interface SelectClick {
  multi: boolean;
}

export interface Visual {
  root: HTMLElement;
  /** These update the visual and its controls without calling onChange. */
  setRows(rows: KpiRow[]): void;
  setSelection(selection: Selection): void;
  setTheme(overrides: ThemeOverrides): void;
  /**
   * Dims every card none of whose KPIs (its transfer points included) is
   * selected; null shows every card in full. Kept when the cards redraw.
   */
  setSelectedKpis(isSelected: ((kpi: EvaluatedKpi) => boolean) | null): void;
  /**
   * Draws the visual flat, in a high-contrast mode's colours (see
   * `highContrastTheme`), on top of the theme `setTheme` sets; null goes
   * back to that theme.
   */
  setHighContrast(colors: HighContrastColors | null): void;
  /**
   * Shows `message` in place of the chain (the cards and arrows), for a host
   * that has no data to draw yet, e.g. "Add Node, Metric, Actual and Budget";
   * null shows the chain again.
   */
  setEmpty(message: string | null): void;
  /** Switches between compact bars and full cards, in place. */
  setCardDisplay(mode: CardDisplay): void;
  /**
   * Shows `text` in a notice between the header and the cards, e.g. why
   * this period is the one shown; null removes it.
   */
  setNotice(text: string | null): void;
  /**
   * Changes the header: the eyebrow and title text, whether the heading
   * (eyebrow, title, subtitle) shows, and whether the subtitle does. Only
   * what is given changes; it is kept when the cards redraw.
   */
  setHeader(header: HeaderOptions): void;
  state(): VisualState;
  destroy(): void;
}

/**
 * The period to open on: the latest year in the rows and, in it, the last
 * month that has any actuals (the data's "current" period). January if none
 * has; the current year if there are no rows at all.
 */
export function defaultSelection(rows: KpiRow[]): Selection {
  if (rows.length === 0) {
    return { year: new Date().getFullYear(), period: PERIODS[0] ?? "" };
  }
  const year = Math.max(...rows.map((row) => row.year));
  const measured = new Set(
    rows
      .filter((row) => row.year === year && row.actual !== null)
      .map((row) => row.period),
  );
  const period =
    [...PERIODS].reverse().find((p) => measured.has(p)) ?? PERIODS[0] ?? "";
  return { year, period };
}

/** The rows' years plus one either side, so a viewer can step past them. */
function yearChoices(rows: KpiRow[], selected: number): number[] {
  const years = new Set(rows.map((row) => row.year));
  if (years.size > 0) {
    years.add(Math.min(...years) - 1);
    years.add(Math.max(...years) + 1);
  }
  years.add(selected);
  return [...years].sort((a, b) => a - b);
}

/**
 * The rows for a selection, plus an empty row for every KPI that has none in
 * it, so every link and KPI is still drawn, as having no data.
 */
function rowsFor(rows: KpiRow[], selection: Selection): KpiRow[] {
  const key = (row: KpiRow) =>
    [row.node, row.group, row.subGroup, row.metric].join("\u0000");
  const selected = rows.filter(
    (row) => row.year === selection.year && row.period === selection.period,
  );
  const present = new Set(selected.map(key));
  const placeholders = new Map<string, KpiRow>();
  for (const row of rows) {
    const k = key(row);
    if (present.has(k) || placeholders.has(k)) continue;
    placeholders.set(k, {
      ...row,
      year: selection.year,
      period: selection.period,
      actual: null,
      budget: null,
    });
  }
  return [...selected, ...placeholders.values()];
}

/**
 * Builds the whole visual inside `container`: the shell, the header controls,
 * a card for every link (the Score Card last) and the arrows between them.
 * Changing Year or Period redraws the cards from `rows`; changing a colour
 * restyles the existing spheres.
 */
export function createVisual(
  container: HTMLElement,
  options: VisualOptions,
): Visual {
  const doc = container.ownerDocument;
  let rows = options.rows;
  let selection = options.selection ?? defaultSelection(rows);
  // The host's theme, and the one drawn: the host's with any high-contrast
  // colours on top.
  let hostTheme = resolveTheme(options.theme);
  let contrast: ThemeOverrides | null = null;
  let theme = hostTheme;

  const shell = createShell(container, {
    theme: options.theme,
    eyebrow: options.eyebrow,
    title: options.title,
  });

  let display: CardDisplay = options.cardDisplay ?? "compact";
  shell.root.classList.toggle("vcv-root--compact", display === "compact");

  const state = (): VisualState => ({
    ...selection,
    fillColor: theme.fillColor,
    shortfallColor: theme.shortfallColor,
  });

  const controls =
    (options.showControls ?? true)
      ? createControls(doc, {
          years: yearChoices(rows, selection.year),
          periods: PERIODS,
          value: state(),
          onChange(change) {
            const { year, period, ...colors } = change;
            if (year !== undefined || period !== undefined) {
              selection = {
                year: year ?? selection.year,
                period: period ?? selection.period,
              };
              render();
            }
            if (Object.keys(colors).length > 0) applyTheme(colors);
            options.onChange?.(state());
          },
        })
      : undefined;
  if (controls) shell.controls.appendChild(controls.element);
  else shell.controls.remove();

  const { onSelect, onDeselect } = options;
  if (onSelect) shell.root.classList.add("vcv-root--selectable");
  if (onSelect || onDeselect) {
    // One listener for every sphere, including those in popovers.
    shell.root.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      // A compact bar opens its card instead; selection happens in there.
      if (target?.closest?.(".vcv-bar, .vcv-detail__close")) return;
      const kpi = target?.closest?.(".vcv-sphere")?.closest(".vcv-kpi");
      const selected = kpi ? kpiOf(kpi) : undefined;
      if (selected) {
        onSelect?.(selected, { multi: event.ctrlKey || event.metaKey });
      } else if (!kpi && !target?.closest?.(".vcv-controls, .vcv-transfer")) {
        onDeselect?.();
      }
    });
  }

  // The cards (or compact bars), the nodes they show, and what was put in
  // the grid for them (a compact bar's slot, or the card itself).
  let cards: HTMLElement[] = [];
  let cardNodes: NodeModel[] = [];
  let placed: HTMLElement[] = [];
  let isSelected: ((kpi: EvaluatedKpi) => boolean) | null = null;
  const connectors = createConnectors(shell.grid, {
    cards: () => cards,
    anchor: (card) => (display === "compact" ? barAnchor(card) : undefined),
  });

  // Compact mode's popups: a link's full card, and a sphere's tooltip. One
  // popup is open at a time: the card, or a pinned transfer points popover.
  const detail = doc.createElement("div");
  detail.className = "vcv-detail";
  detail.setAttribute("role", "dialog");
  detail.hidden = true;
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "vcv-detail__close";
  close.setAttribute("aria-label", "Close details");
  close.textContent = "\u2715";
  const detailBody = doc.createElement("div");
  detailBody.className = "vcv-detail__body";
  detail.append(close, detailBody);
  const tip = doc.createElement("div");
  tip.className = "vcv-tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  shell.root.append(detail, tip);
  let openBar: HTMLElement | null = null;

  function render(): void {
    closeDetail(false);
    hideTip();
    const model = buildModel(rowsFor(rows, selection), selection);
    const next = model.nodes.map((node) => {
      if (display === "compact") return createBar(doc, node);
      const card = (
        isScoreCard(node) ? createScoreCard(doc, node) : createCard(doc, node)
      ).element;
      return { slot: card, bar: card };
    });
    for (const element of placed) element.remove();
    // Cards go ahead of the arrows' overlays, which stay put.
    for (const { slot } of next) {
      shell.grid.insertBefore(slot, connectors.element);
    }
    placed = next.map(({ slot }) => slot);
    cards = next.map(({ bar }) => bar);
    cardNodes = model.nodes;
    dim();

    const measured = model.nodes
      .flatMap(shownKpis)
      .filter((kpi) => kpi.hasData).length;
    const when = `${selection.period} ${selection.year}`;
    shell.setSubtitle(
      measured > 0
        ? `${when} · ${measured} KPIs measured against budget`
        : `${when} · No data loaded for this period`,
    );
    controls?.update(state(), yearChoices(rows, selection.year));
  }

  function dim(): void {
    cards.forEach((card, i) => {
      const node = cardNodes[i];
      const keep = !isSelected || (node && drawnKpis(node).some(isSelected));
      card.classList.toggle("vcv-card--dimmed", !keep);
    });
  }

  /** The visual's box on screen, within the viewport, and its CSS scale. */
  function frame(): { bounds: Box; origin: DOMRect; scale: number } {
    const origin = shell.root.getBoundingClientRect();
    const scale =
      shell.root.offsetWidth > 0 ? origin.width / shell.root.offsetWidth : 1;
    const viewport = doc.documentElement;
    const left = Math.max(origin.left, 0);
    const top = Math.max(origin.top, 0);
    const right = Math.min(origin.right, viewport.clientWidth || origin.right);
    const bottom = Math.min(
      origin.bottom,
      viewport.clientHeight || origin.bottom,
    );
    return {
      origin,
      scale,
      bounds: {
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      },
    };
  }

  function popupMargin(): number {
    const themed = parseFloat(
      doc.defaultView
        ?.getComputedStyle(shell.root)
        .getPropertyValue("--vcv-popover-margin") ?? "",
    );
    return Number.isFinite(themed)
      ? themed
      : parseFloat(defaultTheme.popover.margin);
  }

  /**
   * Below the open bar if it fits, above if not, inside the visual. A card
   * taller than either side's room goes on the roomier side and scrolls, so
   * the popup never covers its own bar.
   */
  function placeDetail(): void {
    if (!openBar) return;
    detail.style.left = "0px";
    detail.style.top = "0px";
    detail.style.maxHeight = "";
    const { bounds, origin, scale } = frame();
    const margin = popupMargin() * scale;
    const anchor = openBar.getBoundingClientRect();
    const size = detail.getBoundingClientRect();
    const below = bounds.top + bounds.height - margin - anchor.bottom - margin;
    const above = anchor.top - margin - (bounds.top + margin);
    const placement =
      size.height <= below
        ? "below"
        : size.height <= above
          ? "above"
          : below >= above
            ? "below"
            : "above";
    const room = Math.max(0, placement === "below" ? below : above);
    const height = Math.min(size.height, room);
    if (height < size.height) detail.style.maxHeight = `${room / scale}px`;
    const left = Math.min(
      Math.max(
        anchor.left + anchor.width / 2 - size.width / 2,
        bounds.left + margin,
      ),
      bounds.left + bounds.width - margin - size.width,
    );
    const top =
      placement === "below"
        ? anchor.bottom + margin
        : anchor.top - margin - height;
    detail.style.left = `${(left - origin.left) / scale}px`;
    detail.style.top = `${(top - origin.top) / scale}px`;
    detail.setAttribute("data-placement", placement);
  }

  function onDocumentClick(event: MouseEvent): void {
    // The path, not the target: in a shadow root (the web component) the
    // document sees the click retargeted to the host element.
    const path = event.composedPath();
    if (path.includes(detail)) return;
    if (path.some((node) => cards.includes(node as HTMLElement))) return;
    closeDetail(false);
  }

  function onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") closeDetail(true);
  }

  function openDetail(bar: HTMLElement): void {
    const node = cardNode(bar);
    if (!node) return;
    closeDetail(false);
    hideTip();
    connectors.unpinAll();
    const card = isScoreCard(node)
      ? createScoreCard(doc, node)
      : createCard(doc, node);
    detailBody.replaceChildren(card.element);
    detail.setAttribute("aria-label", `${node.node} details`);
    detail.hidden = false;
    bar.setAttribute("aria-expanded", "true");
    openBar = bar;
    placeDetail();
    doc.addEventListener("click", onDocumentClick);
    doc.addEventListener("keydown", onDocumentKeydown);
    doc.defaultView?.addEventListener("resize", placeDetail);
  }

  function closeDetail(returnFocus: boolean): void {
    if (!openBar) return;
    const bar = openBar;
    openBar = null;
    detail.hidden = true;
    detailBody.replaceChildren();
    bar.setAttribute("aria-expanded", "false");
    doc.removeEventListener("click", onDocumentClick);
    doc.removeEventListener("keydown", onDocumentKeydown);
    doc.defaultView?.removeEventListener("resize", placeDetail);
    if (returnFocus) bar.focus();
  }

  function toggleDetail(bar: HTMLElement): void {
    if (openBar === bar) closeDetail(false);
    else openDetail(bar);
  }

  /** A sphere's label above it (below if there is no room), in the visual. */
  function showTip(sphere: Element): void {
    tip.textContent = sphere.getAttribute("aria-label") ?? "";
    tip.hidden = false;
    tip.style.left = "0px";
    tip.style.top = "0px";
    const { bounds, origin, scale } = frame();
    const margin = popupMargin() * scale;
    const anchor = sphere.getBoundingClientRect();
    const size = tip.getBoundingClientRect();
    const left = Math.min(
      Math.max(
        anchor.left + anchor.width / 2 - size.width / 2,
        bounds.left + margin,
      ),
      bounds.left + bounds.width - margin - size.width,
    );
    let top = anchor.top - margin - size.height;
    if (top < bounds.top + margin) top = anchor.bottom + margin;
    tip.style.left = `${(left - origin.left) / scale}px`;
    tip.style.top = `${(top - origin.top) / scale}px`;
  }

  function hideTip(): void {
    tip.hidden = true;
  }

  shell.grid.addEventListener("click", (event) => {
    const bar = (event.target as Element | null)?.closest?.(".vcv-bar");
    if (bar instanceof HTMLElement) toggleDetail(bar);
  });
  shell.grid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const bar = (event.target as Element | null)?.closest?.(".vcv-bar");
    if (!(bar instanceof HTMLElement)) return;
    event.preventDefault();
    toggleDetail(bar);
  });
  close.addEventListener("click", () => closeDetail(true));
  // A transfer points popover pinned open closes the card's popup.
  shell.root.addEventListener("vcv-transfer-pin", () => closeDetail(false));
  if (!options.tooltip) {
    shell.grid.addEventListener("mouseover", (event) => {
      const sphere = (event.target as Element | null)?.closest?.(
        ".vcv-bar .vcv-sphere",
      );
      if (sphere) showTip(sphere);
    });
    shell.grid.addEventListener("mouseout", (event) => {
      const sphere = (event.target as Element | null)?.closest?.(
        ".vcv-bar .vcv-sphere",
      );
      if (sphere) hideTip();
    });
  }

  function applyTheme(overrides: ThemeOverrides): void {
    hostTheme = resolveTheme(overrides, hostTheme);
    redrawTheme();
  }

  function redrawTheme(): void {
    theme = contrast ? resolveTheme(contrast, hostTheme) : hostTheme;
    shell.setTheme(theme);
    controls?.update(state());
  }

  const { tooltip } = options;
  if (tooltip) {
    const targetAt = (element: Element | null): TooltipTarget | null => {
      const kpiElement = element?.closest?.(".vcv-kpi, .vcv-bar__kpi");
      const kpi = kpiElement ? kpiOf(kpiElement) : undefined;
      if (kpi) return { kind: "kpi", kpi };
      const card = element?.closest?.(".vcv-card, .vcv-bar");
      const node = card ? cardNode(card) : undefined;
      return node ? { kind: "card", node } : null;
    };
    const same = (a: TooltipTarget | null, b: TooltipTarget) =>
      a?.kind === b.kind &&
      (a.kind === "kpi"
        ? a.kpi === (b as typeof a).kpi
        : a.node === (b as typeof a).node);
    let shown: TooltipTarget | null = null;
    // The host draws the tooltips: drop the native ones on the way in,
    // before the browser shows them.
    shell.root.addEventListener(
      "mouseover",
      (event) => {
        for (
          let element = event.target as Element | null;
          element && element !== shell.root;
          element = element.parentElement
        ) {
          element.removeAttribute("title");
        }
      },
      true,
    );
    shell.root.addEventListener("mousemove", (event) => {
      const target = targetAt(event.target as Element | null);
      const point = { x: event.clientX, y: event.clientY };
      if (!target) {
        if (shown) tooltip.hide();
        shown = null;
      } else if (same(shown, target)) {
        tooltip.move(target, point);
      } else {
        tooltip.show(target, point);
        shown = target;
      }
    });
    shell.root.addEventListener("mouseleave", () => {
      if (shown) tooltip.hide();
      shown = null;
    });
  }

  render();

  return {
    root: shell.root,
    setRows(next) {
      rows = next;
      render();
    },
    setSelection(next) {
      selection = { ...next };
      render();
    },
    setTheme: applyTheme,
    setHighContrast(colors) {
      contrast = colors ? highContrastTheme(colors) : null;
      shell.root.classList.toggle("vcv-root--flat", colors !== null);
      redrawTheme();
    },
    setCardDisplay(mode) {
      if (mode === display) return;
      display = mode;
      shell.root.classList.toggle("vcv-root--compact", display === "compact");
      render();
    },
    setEmpty(message) {
      shell.root.querySelector(".vcv-empty")?.remove();
      shell.root.classList.toggle("vcv-root--empty", message !== null);
      if (message === null) return;
      const empty = doc.createElement("p");
      empty.className = "vcv-empty";
      empty.setAttribute("role", "status");
      empty.textContent = message;
      shell.grid.before(empty);
    },
    setNotice(text) {
      shell.root.querySelector(".vcv-notice")?.remove();
      if (text === null) return;
      const notice = doc.createElement("p");
      notice.className = "vcv-notice";
      notice.setAttribute("role", "status");
      notice.textContent = text;
      shell.root.querySelector(".vcv-header")?.after(notice);
    },
    setHeader(header) {
      shell.setHeading(header);
      if (header.show !== undefined) {
        shell.root.classList.toggle("vcv-root--no-heading", !header.show);
      }
      if (header.showSubtitle !== undefined) {
        shell.root.classList.toggle(
          "vcv-root--no-subtitle",
          !header.showSubtitle,
        );
      }
    },
    setSelectedKpis(next) {
      isSelected = next;
      dim();
    },
    state,
    destroy() {
      closeDetail(false);
      connectors.destroy();
      shell.destroy();
    },
  };
}
