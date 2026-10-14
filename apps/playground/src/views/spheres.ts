import {
  evaluate,
  formatValues,
  type KpiRow,
} from "@AppsWyldeSolutions/vcv-core";
import { createShell, createSphere } from "@AppsWyldeSolutions/vcv-renderer";

interface Example {
  state: string;
  title: string;
  operator: KpiRow["operator"];
  actual: number | null;
  budget: number | null;
}

// The six states of issue #7. The numbers go through core's evaluate(), so
// each sphere is drawn from the same result a real KPI would produce.
const EXAMPLES: Example[] = [
  { state: "met", title: "Met", operator: "LessThan", actual: 7, budget: 10 },
  {
    state: "short",
    title: "Short",
    operator: "Equal",
    actual: 13808,
    budget: 31468,
  },
  {
    state: "exceeded",
    title: "Exceeded",
    operator: "Equal",
    actual: 108,
    budget: 90,
  },
  {
    state: "full",
    title: "Full",
    operator: "LessThan",
    actual: 4.65,
    budget: 3.95,
  },
  { state: "empty", title: "Empty", operator: "Equal", actual: 0, budget: 90 },
  {
    state: "no-data",
    title: "No data",
    operator: "Equal",
    actual: null,
    budget: 90,
  },
];

// Diameters the prototype uses for primary and satellite KPIs; undefined
// leaves the sphere at the theme's default size.
const SIZES = [
  { name: "large", size: "132px" },
  { name: "small", size: undefined },
];

function toRow(example: Example): KpiRow {
  return {
    node: "Playground",
    nodeOrder: 0,
    group: "Primary",
    subGroup: "",
    metric: example.title,
    operator: example.operator,
    valueType: "Number",
    symbol: "",
    year: 2026,
    period: "August",
    actual: example.actual,
    budget: example.budget,
  };
}

function text(tag: string, className: string, content: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

export function renderSpheres(app: HTMLElement): void {
  const shell = createShell(app, {
    subtitle: "Sphere states",
    theme: {
      layout: {
        columns: String(EXAMPLES.length),
        cardMinWidth: "0px",
        rowGap: "40px",
      },
    },
  });

  for (const { name, size } of SIZES) {
    for (const example of EXAMPLES) {
      const row = toRow(example);
      const evaluation = evaluate(row);
      const values = formatValues(row);

      const cell = document.createElement("div");
      cell.className = "pg-cell";
      cell.dataset.state = example.state;
      cell.dataset.size = name;
      cell.append(
        createSphere(document, evaluation, {
          size,
          label: `${example.title}: ${evaluation.label}`,
        }).element,
        text("div", "pg-cell__title", example.title),
        text("div", "pg-cell__label", evaluation.label),
        text(
          "div",
          "pg-cell__detail",
          `${example.operator} · ${values.pair || "no values"}`,
        ),
      );
      shell.grid.appendChild(cell);
    }
  }
}
