// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { fromLongRows } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { testHost } from "./testHost";
import { tableOf } from "./testTable";
import { Visual } from "./visual";

const ROWS = fromLongRows(
  (
    JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../fixtures/bobos-big-block.json"),
        "utf8",
      ),
    ) as { records: unknown[] }
  ).records,
);
const TABLE = tableOf(ROWS);

function construct(options: Parameters<typeof testHost>[0] = {}) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const stub = testHost(options);
  const visual = new Visual({
    element,
    host: stub.host,
  } as powerbi.extensibility.visual.VisualConstructorOptions);
  visual.update({
    dataViews: [{ table: TABLE, metadata: { columns: [] } }],
  } as unknown as powerbi.extensibility.visual.VisualUpdateOptions);
  return { element, visual, ...stub };
}

const cards = (element: Element) =>
  Array.from(element.querySelectorAll<HTMLElement>(".vcv-grid > .vcv-card"));
const dimmed = (element: Element) =>
  cards(element).filter((card) => card.classList.contains("vcv-card--dimmed"));
const sphere = (element: Element, card: number) =>
  cards(element)[card]!.querySelector(".vcv-sphere")!;
const click = (target: Element, init: MouseEventInit = {}) =>
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, ...init }));
/** The selection manager answers asynchronously, as Power BI's does. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The table row behind the first sphere on a card (August 2026). */
function rowOf(element: Element, card: number): number {
  const label = cards(element)[card]!.querySelector(".vcv-kpi__label")!;
  const metric = label.textContent;
  const node = ROWS.find((row) => row.metric === metric)!.node;
  return ROWS.findIndex(
    (row) =>
      row.node === node &&
      row.metric === metric &&
      row.year === 2026 &&
      row.period === "August",
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("selection", () => {
  it("selects the sphere's table row and dims the other cards", async () => {
    const { element, selectionManager } = construct();
    click(sphere(element, 0));
    await settle();
    const [id, multi] = selectionManager.select.mock.calls[0]!;
    expect(id.row).toBe(rowOf(element, 0));
    expect(id.table).toBe(TABLE);
    expect(multi).toBe(false);
    expect(dimmed(element)).toHaveLength(cards(element).length - 1);
    expect(dimmed(element)).not.toContain(cards(element)[0]);
  });

  it("replaces the selection on a plain click", async () => {
    const { element } = construct();
    click(sphere(element, 0));
    click(sphere(element, 1));
    await settle();
    expect(dimmed(element)).toContain(cards(element)[0]);
    expect(dimmed(element)).not.toContain(cards(element)[1]);
  });

  it("adds to the selection on a ctrl-click or cmd-click", async () => {
    const { element, selectionManager } = construct();
    click(sphere(element, 0));
    click(sphere(element, 1), { ctrlKey: true });
    click(sphere(element, 2), { metaKey: true });
    await settle();
    expect(selectionManager.select.mock.calls.map((call) => call[1])).toEqual([
      false,
      true,
      true,
    ]);
    expect(dimmed(element)).toHaveLength(cards(element).length - 3);
  });

  it("clears the selection and restores every card on a click away", async () => {
    const { element, selectionManager } = construct();
    click(sphere(element, 0));
    await settle();
    click(element.querySelector(".vcv-header__title")!);
    await settle();
    expect(selectionManager.clear).toHaveBeenCalled();
    expect(dimmed(element)).toHaveLength(0);
  });

  it("follows the host when it changes or clears the selection", async () => {
    const { element, hostSelects, rowId } = construct();
    hostSelects([rowId(TABLE, rowOf(element, 1))]);
    expect(dimmed(element)).toHaveLength(cards(element).length - 1);
    expect(dimmed(element)).not.toContain(cards(element)[1]);
    hostSelects([]);
    expect(dimmed(element)).toHaveLength(0);
  });

  it("selects nothing where the host allows no interactions", async () => {
    const { element, selectionManager } = construct({
      allowInteractions: false,
    });
    click(sphere(element, 0));
    click(element.querySelector(".vcv-header__title")!);
    await settle();
    expect(selectionManager.select).not.toHaveBeenCalled();
    expect(selectionManager.clear).not.toHaveBeenCalled();
    expect(dimmed(element)).toHaveLength(0);
  });

  it("does not ask the host to clear an empty selection", async () => {
    const { element, selectionManager } = construct();
    click(element.querySelector(".vcv-header__title")!);
    await settle();
    expect(selectionManager.clear).not.toHaveBeenCalled();
  });

  it("keeps the cards as they were when the host refuses a selection", async () => {
    const { element, selectionManager } = construct();
    selectionManager.select.mockRejectedValueOnce(new Error("not now"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    click(sphere(element, 0));
    await settle();
    await settle();
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(dimmed(element)).toHaveLength(0);
  });

  it("keeps the selection across updates", async () => {
    const { element, visual } = construct();
    click(sphere(element, 0));
    await settle();
    visual.update({
      dataViews: [{ table: TABLE, metadata: { columns: [] } }],
    } as unknown as powerbi.extensibility.visual.VisualUpdateOptions);
    expect(dimmed(element)).toHaveLength(cards(element).length - 1);
  });
});
