import { createElement, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ValueChainVisualiser,
  type VcvSelectDetail,
} from "@appswyldesolutions/vcv-react";
import { loadRows } from "./processes.js";

const ROWS = loadRows();

// vcv-react's <ValueChainVisualiser>, showing the last sphere clicked.
function App() {
  const [selected, setSelected] = useState<VcvSelectDetail>();
  return createElement(
    "div",
    { style: { minHeight: "100%" } },
    createElement(
      "output",
      { "data-testid": "selected" },
      selected ? `${selected.node} › ${selected.metric}` : "",
    ),
    createElement(ValueChainVisualiser, {
      rows: ROWS,
      period: "July",
      onSelect: setSelected,
      style: { minHeight: "100%" },
    }),
  );
}

export function renderReact(app: HTMLElement): void {
  createRoot(app).render(createElement(StrictMode, null, createElement(App)));
}
