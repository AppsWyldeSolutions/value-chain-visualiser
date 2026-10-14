/** What the header controls show. */
export interface ControlsValue {
  year: number;
  period: string;
  fillColor: string;
  shortfallColor: string;
}

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
 * Builds the header's Year and Period selects and its two colour pickers.
 * Selects report on change; pickers report while the colour is dragged, so
 * the spheres recolour live.
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

  const element = doc.createElement("div");
  element.className = "vcv-controls";
  element.append(
    field(doc, "year", "Year", year),
    field(doc, "period", "Period", period),
    field(doc, "fill", "Fill colour", fill),
    field(doc, "shortfall", "Shortfall colour", shortfall),
  );

  function update(value: ControlsValue, years?: number[]): void {
    if (years) setOptions(doc, year, years.map(String));
    year.value = String(value.year);
    period.value = value.period;
    // Setting .value fires no events, so this never reports a change.
    const fillHex = pickerValue(value.fillColor);
    if (fillHex) fill.value = fillHex;
    const shortfallHex = pickerValue(value.shortfallColor);
    if (shortfallHex) shortfall.value = shortfallHex;
  }

  update(options.value, options.years);
  return { element, update };
}
