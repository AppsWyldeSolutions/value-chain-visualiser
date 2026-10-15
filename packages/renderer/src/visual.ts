import {
  buildModel,
  type EvaluatedKpi,
  type KpiRow,
  type NodeModel,
} from "@appswyldesolutions/vcv-core";
import { createCard } from "./card.js";
import { createConnectors } from "./connectors.js";
import { createControls, type ControlsValue } from "./controls.js";
import { kpiOf } from "./kpi.js";
import { createScoreCard, isScoreCard, scoreCardKpis } from "./scoreCard.js";
import { createShell } from "./shell.js";
import { resolveTheme, type ThemeOverrides } from "./theme.js";

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
   * Called when a sphere is clicked, with the KPI it shows. When given, the
   * spheres show a pointer.
   */
  onSelect?(kpi: EvaluatedKpi): void;
}

export interface Visual {
  root: HTMLElement;
  /** These update the visual and its controls without calling onChange. */
  setRows(rows: KpiRow[]): void;
  setSelection(selection: Selection): void;
  setTheme(overrides: ThemeOverrides): void;
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

/** The KPIs a node's card shows: the ones counted in the subtitle. */
function shownKpis(node: NodeModel) {
  return isScoreCard(node)
    ? scoreCardKpis(node)
    : [...node.primary, ...node.satellite];
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
  let theme = resolveTheme(options.theme);

  const shell = createShell(container, {
    theme: options.theme,
    eyebrow: options.eyebrow,
    title: options.title,
  });

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

  const { onSelect } = options;
  if (onSelect) {
    shell.root.classList.add("vcv-root--selectable");
    // One listener for every sphere, including those in popovers.
    shell.root.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      const kpi = target?.closest?.(".vcv-sphere")?.closest(".vcv-kpi");
      const selected = kpi ? kpiOf(kpi) : undefined;
      if (selected) onSelect(selected);
    });
  }

  let cards: HTMLElement[] = [];
  const connectors = createConnectors(shell.grid);

  function render(): void {
    const model = buildModel(rowsFor(rows, selection), selection);
    const next = model.nodes.map(
      (node) =>
        (isScoreCard(node) ? createScoreCard(doc, node) : createCard(doc, node))
          .element,
    );
    for (const card of cards) card.remove();
    // Cards go ahead of the arrows' overlays, which stay put.
    for (const card of next) shell.grid.insertBefore(card, connectors.element);
    cards = next;

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

  function applyTheme(overrides: ThemeOverrides): void {
    theme = resolveTheme(overrides, theme);
    shell.setTheme(overrides);
    controls?.update(state());
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
    state,
    destroy() {
      connectors.destroy();
      shell.destroy();
    },
  };
}
