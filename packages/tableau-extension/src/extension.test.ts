// @vitest-environment jsdom
import { defineValueChainVisualiser } from "@appswyldesolutions/vcv-web-component";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startExtension, type ExtensionView } from "./extension.js";
import type { DataTable, TableauApi, Worksheet } from "./tableau.js";
import { fixtureRows, summaryTable } from "./testTable.js";

const ROWS = fixtureRows();
// A few KPIs (twelve rows each) keep each full draw quick under jsdom.
const FIRST = summaryTable(ROWS.slice(0, 3 * 12));
const SECOND = summaryTable(ROWS.slice(3 * 12, 5 * 12));

/** A worksheet whose summary data is `tables`, one per read, last repeated. */
function fakeWorksheet(...tables: DataTable[]) {
  const listeners = new Map<string, (event: { type: string }) => void>();
  const remove = vi.fn(() => true);
  let reads = 0;
  const worksheet: Worksheet = {
    name: "KPIs",
    getSummaryDataAsync: vi.fn(
      async () => tables[Math.min(reads++, tables.length - 1)]!,
    ),
    addEventListener: vi.fn((type, handler) => {
      listeners.set(type, handler);
      return remove;
    }),
  };
  const fire = (type: string) => listeners.get(type)?.({ type });
  return { worksheet, listeners, remove, fire };
}

function fakeTableau(
  worksheets: Worksheet[],
  eventTypes: TableauApi["TableauEventType"] = {
    FilterChanged: "filter-changed",
    SummaryDataChanged: "summary-data-changed",
  },
): TableauApi {
  return {
    extensions: {
      initializeAsync: vi.fn(async () => undefined),
      dashboardContent: { dashboard: { worksheets } },
    },
    TableauEventType: eventTypes,
  };
}

let view: ExtensionView;

beforeEach(() => {
  defineValueChainVisualiser();
  const visual = document.createElement("value-chain-visualiser");
  const status = document.createElement("p");
  status.hidden = true;
  document.body.append(status, visual);
  view = { visual, status };
});

afterEach(() => {
  document.body.replaceChildren();
});

/** The root of what the renderer drew inside the element. */
const drawnRoot = () =>
  view.visual.shadowRoot?.querySelector("style + div")?.firstElementChild;

/** Waits for the reads a change event starts to land. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("startExtension", () => {
  it("initialises with Tableau before reading the worksheet", async () => {
    const { worksheet } = fakeWorksheet(FIRST);
    const tableau = fakeTableau([worksheet]);
    await startExtension(tableau, view);
    const init = vi.mocked(tableau.extensions.initializeAsync).mock
      .invocationCallOrder[0]!;
    const read = vi.mocked(worksheet.getSummaryDataAsync).mock
      .invocationCallOrder[0]!;
    expect(init).toBeLessThan(read);
  });

  it("draws the first worksheet's summary data in <value-chain-visualiser>", async () => {
    const { worksheet } = fakeWorksheet(FIRST);
    await startExtension(fakeTableau([worksheet]), view);
    expect(view.visual.rows).toHaveLength(3 * 12);
    expect(view.visual.shadowRoot?.querySelector("svg")).not.toBeNull();
    expect(view.status.hidden).toBe(true);
  });

  it("shows compact cards by default", async () => {
    const { worksheet } = fakeWorksheet(FIRST);
    await startExtension(fakeTableau([worksheet]), view);
    expect(view.visual.cardDisplay).toBe("compact");
  });

  it("redraws in place when the worksheet's summary data changes", async () => {
    const { worksheet, fire } = fakeWorksheet(FIRST, SECOND);
    await startExtension(fakeTableau([worksheet]), view);
    const drawn = drawnRoot();
    fire("summary-data-changed");
    await settle();
    expect(worksheet.getSummaryDataAsync).toHaveBeenCalledTimes(2);
    expect(view.visual.rows).toHaveLength(2 * 12);
    expect(view.visual.rows?.[0]).toEqual(ROWS[3 * 12]);
    // The same element and drawing: redrawn, not rebuilt.
    expect(document.querySelectorAll("value-chain-visualiser")).toHaveLength(1);
    expect(drawn).toBeTruthy();
    expect(drawnRoot()).toBe(drawn);
  });

  it("listens for filter changes where Tableau has no SummaryDataChanged", async () => {
    const { worksheet, listeners } = fakeWorksheet(FIRST);
    await startExtension(
      fakeTableau([worksheet], { FilterChanged: "filter-changed" }),
      view,
    );
    expect([...listeners.keys()]).toEqual(["filter-changed"]);
  });

  it("ignores a read that a newer change has overtaken", async () => {
    let resolveSlow: (table: DataTable) => void = () => {};
    const { worksheet, fire } = fakeWorksheet(FIRST);
    await startExtension(fakeTableau([worksheet]), view);
    vi.mocked(worksheet.getSummaryDataAsync)
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveSlow = resolve)),
      )
      .mockImplementationOnce(async () => SECOND);
    fire("summary-data-changed");
    fire("summary-data-changed");
    await settle();
    resolveSlow(FIRST);
    await settle();
    expect(view.visual.rows?.[0]).toEqual(ROWS[3 * 12]);
  });

  it("stops listening when the returned function is called", async () => {
    const { worksheet, remove } = fakeWorksheet(FIRST);
    const stop = await startExtension(fakeTableau([worksheet]), view);
    stop();
    expect(remove).toHaveBeenCalledOnce();
  });

  it("names the required fields the worksheet lacks, drawing nothing", async () => {
    const partial = summaryTable(ROWS.slice(0, 12), [
      "node",
      "group",
      "year",
      "period",
      "actual",
    ]);
    const { worksheet } = fakeWorksheet(partial);
    await startExtension(fakeTableau([worksheet]), view);
    expect(view.status.hidden).toBe(false);
    expect(view.status.textContent).toBe(
      '"KPIs" needs fields named metric and budget.',
    );
    expect(view.visual.hidden).toBe(true);
    expect(view.visual.rows).toBeUndefined();
  });

  it("draws once the missing fields are added", async () => {
    const partial = summaryTable(ROWS.slice(0, 12), ["node", "metric"]);
    const { worksheet, fire } = fakeWorksheet(partial, FIRST);
    await startExtension(fakeTableau([worksheet]), view);
    fire("summary-data-changed");
    await settle();
    expect(view.status.hidden).toBe(true);
    expect(view.visual.hidden).toBe(false);
    expect(view.visual.rows).toHaveLength(3 * 12);
  });

  it("draws without the optional fields, saying nothing", async () => {
    const required = summaryTable(ROWS.slice(0, 12), [
      "node",
      "group",
      "metric",
      "year",
      "period",
      "actual",
      "budget",
    ]);
    const { worksheet } = fakeWorksheet(required);
    await startExtension(fakeTableau([worksheet]), view);
    expect(view.status.hidden).toBe(true);
    expect(view.visual.rows).toHaveLength(12);
  });

  it("says so when the worksheet has no marks", async () => {
    const { worksheet } = fakeWorksheet(summaryTable([]));
    await startExtension(fakeTableau([worksheet]), view);
    expect(view.status.textContent).toBe('"KPIs" has no marks to show.');
    expect(view.visual.hidden).toBe(true);
  });

  it("asks for a worksheet when the dashboard has none", async () => {
    await startExtension(fakeTableau([]), view);
    expect(view.status.textContent).toBe(
      "Add a worksheet to the dashboard to show its KPIs.",
    );
  });

  it("says so when Tableau will not initialise the extension", async () => {
    const tableau = fakeTableau([]);
    vi.mocked(tableau.extensions.initializeAsync).mockRejectedValue(
      new Error("not in Tableau"),
    );
    await startExtension(tableau, view);
    expect(view.status.textContent).toBe(
      "Could not start the extension: not in Tableau",
    );
  });

  it("says so when the worksheet's data cannot be read", async () => {
    const { worksheet } = fakeWorksheet(FIRST);
    vi.mocked(worksheet.getSummaryDataAsync).mockRejectedValue(
      new Error("permission denied"),
    );
    await startExtension(fakeTableau([worksheet]), view);
    expect(view.status.textContent).toBe(
      'Could not read "KPIs": permission denied',
    );
    expect(view.visual.rows).toBeUndefined();
  });
});
