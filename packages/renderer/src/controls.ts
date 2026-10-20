import type { CardDisplay } from "./compact.js";

/** What the header controls show. */
export interface ControlsValue {
  year: number;
  period: string;
  fillColor: string;
  shortfallColor: string;
  /** Compact bars or full cards, from the View switch. */
  cardDisplay: CardDisplay;
}

const VIEWS: { value: CardDisplay; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "full", label: "Full card" },
];

let viewIds = 0;

export interface ControlsOptions {
  years: number[];
  periods: string[];
  value: ControlsValue;
  /** Called with just the field the viewer changed. */
  onChange(change: Partial<ControlsValue>): void;
}

export interface Controls {
  element: HTMLElement;
  /** Shows a new value (and, if given, new years) without calling onChange. */
  update(value: ControlsValue, years?: number[]): void;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** "#abc" -> "#aabbcc"; null for anything a colour picker cannot show. */
function pickerValue(color: string): string | null {
  const match = color.trim().match(HEX);
  if (!match?.[1]) return null;
  const digits =
    match[1].length === 3
      ? Array.from(match[1], (d) => d + d).join("")
      : match[1];
  return `#${digits.toLowerCase()}`;
}

function field(
  doc: Document,
  name: string,
  label: string,
  input: HTMLElement,
): HTMLLabelElement {
  const text = doc.createElement("span");
  text.className = "vcv-control__label";
  text.textContent = label;
  input.classList.add("vcv-control__input");
  const wrapper = doc.createElement("label");
  wrapper.className = `vcv-control vcv-control--${name}`;
  wrapper.append(text, input);
  return wrapper;
}

function setOptions(
  doc: Document,
  select: HTMLSelectElement,
  values: string[],
): void {
  select.replaceChildren(
    ...values.map((value) => {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = value;
      return option;
    }),
  );
}

function colorInput(doc: Document, ariaLabel: string): HTMLInputElement {
  const input = doc.createElement("input");
  input.type = "color";
  input.setAttribute("aria-label", ariaLabel);
  return input;
}

/**
 * The View switch: Compact | Full card, as a radio group. One tab stop (the
 * chosen option); the arrow keys move and choose, as in any radio group.
 */
function viewSwitch(
  doc: Document,
  onChange: (cardDisplay: CardDisplay) => void,
): { element: HTMLElement; show(value: CardDisplay): void } {
  const label = doc.createElement("span");
  label.className = "vcv-control__label";
  label.id = `vcv-view-${++viewIds}`;
  label.textContent = "View";
  const group = doc.createElement("div");
  group.className = "vcv-segments";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-labelledby", label.id);
  const buttons = VIEWS.map(({ value, label: text }) => {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "vcv-segment";
    button.setAttribute("role", "radio");
    button.dataset.value = value;
    button.textContent = text;
    return button;
  });
  let current: CardDisplay = "compact";

  function show(value: CardDisplay): void {
    current = value;
    for (const button of buttons) {
      const chosen = button.dataset.value === value;
      button.setAttribute("aria-checked", String(chosen));
      button.tabIndex = chosen ? 0 : -1;
    }
  }

  function choose(value: CardDisplay): void {
    if (value === current) return;
    show(value);
    onChange(value);
  }

  buttons.forEach((button, i) => {
    button.addEventListener("click", () =>
      choose(button.dataset.value as CardDisplay),
    );
    button.addEventListener("keydown", (event) => {
      const step =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : 0;
      if (!step) return;
      event.preventDefault();
      const next = buttons[(i + step + buttons.length) % buttons.length]!;
      next.focus();
      choose(next.dataset.value as CardDisplay);
    });
  });
  group.append(...buttons);

  const element = doc.createElement("div");
  element.className = "vcv-control vcv-control--view";
  element.append(label, group);
  return { element, show };
}

/**
 * Builds the header's Year and Period selects, the View switch and the two
 * colour pickers. Selects report on change; pickers report while the colour
 * is dragged, so the spheres recolour live.
 */
export function createControls(
  doc: Document,
  options: ControlsOptions,
): Controls {
  const year = doc.createElement("select");
  const period = doc.createElement("select");
  setOptions(doc, period, options.periods);
  const fill = colorInput(doc, "Fill colour when target is met");
  const shortfall = colorInput(doc, "Fill colour when target is missed");

  year.addEventListener("change", () =>
    options.onChange({ year: Number(year.value) }),
  );
  period.addEventListener("change", () =>
    options.onChange({ period: period.value }),
  );
  fill.addEventListener("input", () =>
    options.onChange({ fillColor: fill.value }),
  );
  shortfall.addEventListener("input", () =>
    options.onChange({ shortfallColor: shortfall.value }),
  );

  const view = viewSwitch(doc, (cardDisplay) =>
    options.onChange({ cardDisplay }),
  );

  const element = doc.createElement("div");
  element.className = "vcv-controls";
  element.append(
    field(doc, "year", "Year", year),
    field(doc, "period", "Period", period),
    view.element,
    field(doc, "fill", "Fill colour", fill),
    field(doc, "shortfall", "Shortfall colour", shortfall),
  );

  function update(value: ControlsValue, years?: number[]): void {
    if (years) setOptions(doc, year, years.map(String));
    year.value = String(value.year);
    period.value = value.period;
    view.show(value.cardDisplay);
    // Setting .value fires no events, so this never reports a change.
    const fillHex = pickerValue(value.fillColor);
    if (fillHex) fill.value = fillHex;
    const shortfallHex = pickerValue(value.shortfallColor);
    if (shortfallHex) shortfall.value = shortfallHex;
  }

  update(options.value, options.years);
  return { element, update };
}
