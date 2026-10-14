import {
  fromLongRows,
  fromWideRecords,
  type EvaluatedKpi,
  type KpiRow,
} from "@AppsWyldeSolutions/vcv-core";
import {
  createVisual,
  defaultSelection,
  defaultTheme,
  type Selection,
  type ThemeOverrides,
  type Visual,
  type VisualState,
} from "@AppsWyldeSolutions/vcv-renderer";

export const TAG_NAME = "value-chain-visualiser";

/** What `vcv-select` carries: the clicked KPI and how it was evaluated. */
export interface VcvSelectDetail {
  node: string;
  group: string;
  subGroup: string;
  metric: string;
  year: number;
  period: string;
  actual: number | null;
  budget: number | null;
  hasData: boolean;
  met: boolean;
  level: number;
  label: string;
}

/** What `vcv-change` carries: the viewer's year, period and colours. */
export type VcvChangeDetail = VisualState;

/**
 * Turns fetched JSON into rows. Accepted: `{ records: [...] }` or a bare
 * array of long rows (the Power BI / API shape), or an array of the
 * prototype's wide records.
 */
export function rowsFromJson(json: unknown): KpiRow[] {
  if (Array.isArray(json)) {
    const first: unknown = json[0];
    if (first && typeof first === "object" && "l" in first && "a" in first) {
      return fromWideRecords(json);
    }
    if (
      first === undefined ||
      (typeof first === "object" && first && "link" in first)
    ) {
      return fromLongRows(json);
    }
  } else if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { records?: unknown }).records)
  ) {
    return fromLongRows((json as { records: unknown[] }).records);
  }
  throw new Error(
    'Expected long rows (an array, or an object with "records") or the prototype\'s wide records',
  );
}

function selectDetail(kpi: EvaluatedKpi): VcvSelectDetail {
  const { row } = kpi;
  return {
    node: row.node,
    group: row.group,
    subGroup: row.subGroup,
    metric: row.metric,
    year: row.year,
    period: row.period,
    actual: row.actual,
    budget: row.budget,
    hasData: kpi.hasData,
    met: kpi.met,
    level: kpi.level,
    label: kpi.label,
  };
}

/**
 * `<value-chain-visualiser>`: the whole visual in a shadow root.
 *
 * Attributes:
 * - `data-src`: URL of the KPI data as JSON, fetched when the element is on
 *   the page and again whenever the attribute changes. This is the only
 *   network access in the project; core and the renderer make none.
 * - `data-year`, `data-period`: the selection to show. Without them it opens
 *   on the data's latest period with actuals.
 * - `data-fill-color`, `data-shortfall-color`: the two sphere colours.
 *
 * Instead of `data-src`, a host can set the `rows` property to `KpiRow`s.
 *
 * Events, all bubbling out of the shadow root:
 * - `vcv-select` when a sphere is clicked, with a `VcvSelectDetail`.
 * - `vcv-change` when the viewer changes a control, with the new state.
 * - `vcv-error` when `data-src` cannot be loaded, with the `Error`.
 */
export class ValueChainVisualiserElement extends HTMLElement {
  static observedAttributes = [
    "data-src",
    "data-year",
    "data-period",
    "data-fill-color",
    "data-shortfall-color",
  ];

  #container: HTMLElement;
  #rows: KpiRow[] | undefined;
  #visual: Visual | undefined;
  /** The src last fetched (or being fetched), so a reconnect does not refetch. */
  #loadedSrc: string | null = null;
  #loadId = 0;
  #abort: AbortController | undefined;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = ":host { display: block; }";
    this.#container = document.createElement("div");
    shadow.append(style, this.#container);
  }

  get rows(): KpiRow[] | undefined {
    return this.#rows;
  }

  set rows(rows: KpiRow[] | undefined) {
    // Rows set directly win over any fetch still on its way.
    this.#abort?.abort();
    this.#loadId++;
    this.#rows = rows;
    this.#render();
  }

  connectedCallback(): void {
    const src = this.getAttribute("data-src");
    if (src !== null && src !== this.#loadedSrc) void this.#load(src);
    else this.#render();
  }

  disconnectedCallback(): void {
    this.#visual?.destroy();
    this.#visual = undefined;
  }

  attributeChangedCallback(
    name: string,
    previous: string | null,
    value: string | null,
  ): void {
    if (previous === value) return;
    switch (name) {
      case "data-src":
        if (value !== null && this.isConnected) void this.#load(value);
        break;
      case "data-year":
      case "data-period":
        this.#visual?.setSelection(this.#selection(this.#rows ?? []));
        break;
      case "data-fill-color":
        this.#visual?.setTheme({
          fillColor: value ?? defaultTheme.fillColor,
        });
        break;
      case "data-shortfall-color":
        this.#visual?.setTheme({
          shortfallColor: value ?? defaultTheme.shortfallColor,
        });
        break;
    }
  }

  async #load(src: string): Promise<void> {
    this.#abort?.abort();
    const abort = new AbortController();
    this.#abort = abort;
    const id = ++this.#loadId;
    this.#loadedSrc = src;
    try {
      const response = await fetch(src, { signal: abort.signal });
      if (!response.ok) {
        throw new Error(
          `Could not load ${src}: ${response.status} ${response.statusText}`.trim(),
        );
      }
      const rows = rowsFromJson(await response.json());
      // A newer src or rows set directly since: this reply is stale.
      if (id !== this.#loadId) return;
      this.#rows = rows;
      this.#render();
    } catch (error) {
      if (id !== this.#loadId) return;
      this.#loadedSrc = null;
      this.#emit(
        "vcv-error",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /** The selection the attributes ask for, filling gaps from the data. */
  #selection(rows: KpiRow[]): Selection {
    const fallback = defaultSelection(rows);
    const year = Number(this.getAttribute("data-year"));
    return {
      year: Number.isInteger(year) && year > 0 ? year : fallback.year,
      period: this.getAttribute("data-period") ?? fallback.period,
    };
  }

  #theme(): ThemeOverrides {
    const theme: ThemeOverrides = {};
    const fill = this.getAttribute("data-fill-color");
    const shortfall = this.getAttribute("data-shortfall-color");
    if (fill) theme.fillColor = fill;
    if (shortfall) theme.shortfallColor = shortfall;
    return theme;
  }

  #render(): void {
    if (!this.isConnected || !this.#rows) return;
    const selection = this.#selection(this.#rows);
    if (this.#visual) {
      this.#visual.setRows(this.#rows);
      this.#visual.setSelection(selection);
      return;
    }
    this.#visual = createVisual(this.#container, {
      rows: this.#rows,
      selection,
      theme: this.#theme(),
      onChange: (state) => this.#emit("vcv-change", state),
      onSelect: (kpi) => this.#emit("vcv-select", selectDetail(kpi)),
    });
  }

  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true }),
    );
  }
}

/** Registers `<value-chain-visualiser>`, once; later calls do nothing. */
export function defineValueChainVisualiser(): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, ValueChainVisualiserElement);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "value-chain-visualiser": ValueChainVisualiserElement;
  }
}
