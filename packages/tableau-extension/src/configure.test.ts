// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderConfigForm, type ConfigFormOptions } from "./configure.js";
import type { Mapping } from "./mapping.js";
import { FIELDS } from "./rows.js";

// The Configure dialog's form: pick a worksheet, then a column for each of
// the visual's fields.
const WORKSHEETS = [
  {
    name: "Shaped",
    columns: [
      "node",
      "group",
      "metric",
      "year",
      "period",
      "SUM(actual)",
      "SUM(budget)",
    ],
  },
  {
    name: "Scorecard",
    columns: [
      "Process",
      "KPI Group",
      "KPI Name",
      "Year",
      "Month",
      "SUM(Actual $)",
      "SUM(Budget $)",
    ],
  },
];

let root: HTMLElement;
let onSave: ConfigFormOptions["onSave"];
let onCancel: ConfigFormOptions["onCancel"];

beforeEach(() => {
  root = document.createElement("div");
  document.body.append(root);
  onSave = vi.fn();
  onCancel = vi.fn();
});

afterEach(() => {
  document.body.replaceChildren();
});

function render(mapping?: Mapping) {
  renderConfigForm(root, {
    worksheets: WORKSHEETS,
    mapping,
    onSave,
    onCancel,
  });
}

const select = (name: string) =>
  root.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;
const save = () =>
  root.querySelector<HTMLButtonElement>('button[type="submit"]')!;

function choose(name: string, value: string) {
  select(name).value = value;
  select(name).dispatchEvent(new Event("change", { bubbles: true }));
}

describe("renderConfigForm", () => {
  it("offers the dashboard's worksheets and a column for every field", () => {
    render();
    expect([...select("worksheet").options].map((o) => o.value)).toEqual([
      "Shaped",
      "Scorecard",
    ]);
    for (const field of FIELDS) {
      expect(select(field), field).not.toBeNull();
    }
    const metric = [...select("metric").options].map((o) => o.value);
    expect(metric).toEqual(["", ...WORKSHEETS[0]!.columns]);
  });

  it("labels each field, marking the required ones", () => {
    render();
    const label = (field: string) =>
      select(field).closest("label")?.textContent ?? "";
    expect(label("metric")).toContain("Metric");
    expect(label("metric")).toContain("required");
    expect(label("symbol")).toContain("Unit symbol");
    expect(label("symbol")).not.toContain("required");
    expect(select("metric").required).toBe(true);
    expect(select("symbol").required).toBe(false);
  });

  it("starts from the convention's matches when nothing is saved", () => {
    render();
    expect(select("worksheet").value).toBe("Shaped");
    expect(select("metric").value).toBe("metric");
    expect(select("actual").value).toBe("SUM(actual)");
    expect(select("symbol").value).toBe("");
    expect(save().disabled).toBe(false);
  });

  it("starts from the saved mapping", () => {
    render({
      worksheet: "Scorecard",
      fields: { node: "Process", metric: "KPI Name" },
    });
    expect(select("worksheet").value).toBe("Scorecard");
    expect(select("node").value).toBe("Process");
    expect(select("metric").value).toBe("KPI Name");
    // Not mapped, and no column has its name.
    expect(select("actual").value).toBe("");
  });

  it("keeps Save disabled until every required field has a column", () => {
    render();
    choose("worksheet", "Scorecard");
    expect(save().disabled).toBe(true);
    for (const [field, column] of [
      ["node", "Process"],
      ["group", "KPI Group"],
      ["metric", "KPI Name"],
      ["year", "Year"],
      ["period", "Month"],
      ["actual", "SUM(Actual $)"],
    ] as const) {
      choose(field, column);
      expect(save().disabled, field).toBe(true);
    }
    choose("budget", "SUM(Budget $)");
    expect(save().disabled).toBe(false);
  });

  it("offers the chosen worksheet's columns when the worksheet changes", () => {
    render();
    choose("worksheet", "Scorecard");
    expect([...select("node").options].map((o) => o.value)).toEqual([
      "",
      ...WORKSHEETS[1]!.columns,
    ]);
    expect(select("metric").value).toBe("");
  });

  it("saves the worksheet and the fields given a column", () => {
    render();
    choose("symbol", "metric");
    save().click();
    expect(onSave).toHaveBeenCalledWith({
      worksheet: "Shaped",
      fields: {
        node: "node",
        group: "group",
        metric: "metric",
        symbol: "metric",
        year: "year",
        period: "period",
        actual: "SUM(actual)",
        budget: "SUM(budget)",
      },
    });
  });

  it("cancels", () => {
    render();
    root.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("says so when the dashboard has no worksheets", () => {
    renderConfigForm(root, { worksheets: [], onSave, onCancel });
    expect(root.textContent).toContain("Add a worksheet to the dashboard");
    expect(save()).toBeNull();
  });

  it("writes names into the page as text, never as markup", () => {
    renderConfigForm(root, {
      worksheets: [{ name: "<img src=x>", columns: ["<b>bold</b>"] }],
      onSave,
      onCancel,
    });
    expect(root.querySelector("img, b")).toBeNull();
    expect(select("worksheet").options[0]!.textContent).toBe("<img src=x>");
  });
});
