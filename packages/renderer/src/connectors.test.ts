// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createConnectors } from "./connectors.js";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// jsdom does no layout, so each element is told where it is.
function place(element: Element, rect: Rect): void {
  element.getBoundingClientRect = () =>
    ({
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => rect,
    }) as DOMRect;
}

function addCard(grid: HTMLElement, rect: Rect): HTMLElement {
  const card = document.createElement("article");
  card.className = "vcv-card";
  place(card, rect);
  grid.appendChild(card);
  return card;
}

function makeGrid(): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "vcv-grid";
  // The grid sits 100px in and 50px down the page.
  place(grid, { left: 100, top: 50, width: 1384, height: 1280 });
  document.body.appendChild(grid);
  return grid;
}

function kinds(svg: Element): (string | null)[] {
  return Array.from(svg.querySelectorAll(".vcv-connector"), (connector) =>
    connector.getAttribute("data-kind"),
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createConnectors", () => {
  it("adds a decorative SVG overlay to the grid", () => {
    const grid = makeGrid();
    const connectors = createConnectors(grid);
    expect(connectors.element.parentElement).toBe(grid);
    expect(connectors.element.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(connectors.element.getAttribute("class")).toBe("vcv-connectors");
    expect(connectors.element.getAttribute("aria-hidden")).toBe("true");
  });

  it("joins consecutive cards, in coordinates relative to the grid", () => {
    const grid = makeGrid();
    addCard(grid, { left: 100, top: 50, width: 424, height: 608 });
    addCard(grid, { left: 580, top: 50, width: 424, height: 608 });
    addCard(grid, { left: 100, top: 722, width: 424, height: 608 });
    const { element } = createConnectors(grid);

    expect(kinds(element)).toEqual(["across", "turn"]);
    const first = element.querySelector(".vcv-connector");
    expect(first?.getAttribute("class")).toBe(
      "vcv-connector vcv-connector--across",
    );
    const line = first?.querySelector(".vcv-connector__line");
    expect(line?.getAttribute("d")).toBe("M426 187 H466");
    expect(line?.classList.contains("vcv-flow")).toBe(true);
    expect(
      first?.querySelector(".vcv-connector__head")?.getAttribute("points"),
    ).toBe("466,179 480,187 466,195");
  });

  it("ignores grid children that are not cards", () => {
    const grid = makeGrid();
    addCard(grid, { left: 100, top: 50, width: 424, height: 608 });
    const note = document.createElement("div");
    place(note, { left: 580, top: 50, width: 424, height: 608 });
    grid.appendChild(note);
    addCard(grid, { left: 100, top: 722, width: 424, height: 608 });

    expect(kinds(createConnectors(grid).element)).toEqual(["down"]);
  });

  it("redraws from the cards' new positions on update", () => {
    const grid = makeGrid();
    const a = addCard(grid, { left: 100, top: 50, width: 424, height: 608 });
    const b = addCard(grid, { left: 580, top: 50, width: 424, height: 608 });
    const connectors = createConnectors(grid);
    expect(kinds(connectors.element)).toEqual(["across"]);

    // One column: the second card drops below the first.
    place(a, { left: 100, top: 50, width: 424, height: 608 });
    place(b, { left: 100, top: 722, width: 424, height: 608 });
    connectors.update();
    expect(kinds(connectors.element)).toEqual(["down"]);
  });

  it("draws nothing while the cards have no layout", () => {
    const grid = document.createElement("div");
    grid.append(
      Object.assign(document.createElement("article"), {
        className: "vcv-card",
      }),
      Object.assign(document.createElement("article"), {
        className: "vcv-card",
      }),
    );
    expect(kinds(createConnectors(grid).element)).toEqual([]);
  });

  it("removes the overlay on destroy", () => {
    const grid = makeGrid();
    const connectors = createConnectors(grid);
    connectors.destroy();
    expect(grid.querySelector(".vcv-connectors")).toBeNull();
  });
});
