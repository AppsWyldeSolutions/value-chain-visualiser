import type { Mapping } from "./mapping.js";
import {
  FIELD_LABELS,
  FIELDS,
  matchingColumn,
  REQUIRED,
  type Field,
  type FieldColumns,
} from "./rows.js";

// The Configure dialog's form: the author picks a worksheet, then the column
// that holds each of the visual's fields. Plain DOM, and every name from the
// workbook goes in as text (textContent, option text), never as markup.

/** A worksheet on the dashboard, and its summary-data column names. */
export interface WorksheetColumns {
  name: string;
  columns: string[];
}

export interface ConfigFormOptions {
  worksheets: WorksheetColumns[];
  /** The saved mapping, to start from. */
  mapping?: Mapping;
  /** Called on Save. If it rejects, the form says so and stays open. */
  onSave(mapping: Mapping): void | Promise<void>;
  onCancel(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const isRequired = (field: Field) => REQUIRED.includes(field);

/** Builds the form in `root`, replacing what was there. */
export function renderConfigForm(
  root: HTMLElement,
  options: ConfigFormOptions,
): void {
  const { worksheets, mapping, onSave, onCancel } = options;
  const cancel = element("button", { type: "button" }, "Cancel");
  cancel.addEventListener("click", () => onCancel());

  if (worksheets.length === 0) {
    root.replaceChildren(
      element(
        "p",
        {},
        "Add a worksheet to the dashboard, then configure the extension.",
      ),
      element("div", { className: "actions" }, cancel),
    );
    return;
  }

  const worksheet = element("select", { name: "worksheet", required: true });
  for (const { name } of worksheets) worksheet.append(new Option(name, name));
  worksheet.value = worksheets.some((w) => w.name === mapping?.worksheet)
    ? mapping!.worksheet
    : worksheets[0]!.name;

  const selects = new Map<Field, HTMLSelectElement>();
  const rows = FIELDS.map((field) => {
    const select = element("select", {
      name: field,
      required: isRequired(field),
    });
    selects.set(field, select);
    return element(
      "label",
      {},
      element("span", { className: "name" }, FIELD_LABELS[field]),
      // Empty for an optional field, so every select starts in one column.
      element(
        "span",
        { className: "required" },
        isRequired(field) ? "required" : "",
      ),
      select,
    );
  });

  /** Offers the chosen worksheet's columns, each field starting from the
   * saved mapping (for its worksheet) or the convention's match. */
  const fillColumns = () => {
    const columns =
      worksheets.find((w) => w.name === worksheet.value)?.columns ?? [];
    const saved =
      mapping?.worksheet === worksheet.value ? mapping.fields : undefined;
    for (const [field, select] of selects) {
      select.replaceChildren(
        new Option(isRequired(field) ? "Choose a field" : "Not mapped", ""),
        ...columns.map((column) => new Option(column, column)),
      );
      const savedColumn = saved?.[field];
      select.value =
        savedColumn && columns.includes(savedColumn)
          ? savedColumn
          : (matchingColumn(field, columns) ?? "");
    }
  };

  const save = element("button", { type: "submit" }, "Save");
  const error = element("p", { className: "error", hidden: true });
  error.setAttribute("role", "alert");
  const updateSave = () => {
    save.disabled = REQUIRED.some((field) => !selects.get(field)!.value);
  };

  const form = element(
    "form",
    {},
    element("h1", {}, "Value Chain Visualiser"),
    element(
      "p",
      { className: "help" },
      "Choose the worksheet to draw, then the field that holds each of the visual's. Fields left unmapped are read by their own names (see the extension's docs).",
    ),
    element(
      "label",
      { className: "worksheet" },
      element("span", { className: "name" }, "Worksheet"),
      worksheet,
    ),
    element("fieldset", {}, element("legend", {}, "Fields"), ...rows),
    error,
    element("div", { className: "actions" }, cancel, save),
  );
  form.addEventListener("change", (event) => {
    if (event.target === worksheet) fillColumns();
    updateSave();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields: FieldColumns = {};
    for (const [field, select] of selects) {
      if (select.value) fields[field] = select.value;
    }
    error.hidden = true;
    save.disabled = true;
    Promise.resolve(onSave({ worksheet: worksheet.value, fields })).catch(
      (reason: unknown) => {
        error.textContent = `Could not save: ${reason instanceof Error ? reason.message : String(reason)}`;
        error.hidden = false;
        updateSave();
      },
    );
  });

  fillColumns();
  updateSave();
  root.replaceChildren(form);
}
