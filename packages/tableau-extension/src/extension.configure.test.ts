// @vitest-environment jsdom
import type { KpiRow } from "@appswyldesolutions/vcv-web-component";
import { defineValueChainVisualiser } from "@appswyldesolutions/vcv-web-component";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIGURE_DIALOG,
  startExtension,
  type ExtensionView,
} from "./extension.js";
import { SETTINGS_KEY } from "./mapping.js";
import type { DataTable, Settings, TableauApi, Worksheet } from "./tableau.js";
import { fixtureRows, summaryTable } from "./testTable.js";

// The v2 field mapping (#62): Configure… opens the mapping dialog; the
// mapping it saves is read at start and whenever it changes.
// Two worksheets with different KPIs, so a test can tell which is drawn.
const SHAPED_ROWS = fixtureRows().slice(0, 2 * 12);
const ROWS = fixtureRows().slice(2 * 12, 4 * 12);
const NAMES: Record<keyof KpiRow, string> = {
  node: "Process",
  nodeOrder: "Process Order",
  group: "KPI Group",
  subGroup: "KPI Sub-group",
  metric: "KPI Name",
  operator: "Rule",
  valueType: "Value Kind",
  symbol: "Unit",
  year: "Year",
  period: "Month",
  actual: "SUM(Actual $)",
  budget: "SUM(Budget $)",
};
/** A worksheet with the author's own field names: draws ROWS once mapped. */
const OWN_NAMES = summaryTable(ROWS, undefined, NAMES);
/** A worksheet shaped to the v1 convention: draws SHAPED_ROWS. */
const SHAPED = summaryTable(SHAPED_ROWS);
const MAPPING = { version: 1, worksheet: "Scorecard", fields: NAMES };

function fakeWorksheet(name: string, table: DataTable) {
  const listeners: ((event: { type: string }) => void)[] = [];
  const worksheet: Worksheet = {
    name,
    getSummaryDataAsync: vi.fn(async () => table),
    addEventListener: vi.fn((_type, listener) => {
      listeners.push(listener);
      return vi.fn(() => true);
    }),
  };
  return worksheet;
}

interface FakeOptions {
  worksheets?: Worksheet[];
  saved?: object;
  mode?: "authoring" | "viewing";
  /** What the dialog does: save this mapping, or be closed by the user. */
  dialog?: object | "closed";
}

function fakeTableau(options: FakeOptions = {}) {
  const values: Record<string, string> = {};
  if (options.saved) values[SETTINGS_KEY] = JSON.stringify(options.saved);
  const settingsListeners: (() => void)[] = [];
  const removeSettingsListener = vi.fn(() => true);
  const settings: Settings = {
    get: vi.fn((key: string) => values[key]),
    set: vi.fn((key: string, value: string) => {
      values[key] = value;
    }),
    saveAsync: vi.fn(async () => values),
    addEventListener: vi.fn((_type, listener) => {
      settingsListeners.push(listener);
      return removeSettingsListener;
    }),
  };
  let configure: (() => void) | undefined;
  const tableau = {
    extensions: {
      initializeAsync: vi.fn(async (callbacks?: { configure?: () => void }) => {
        configure = callbacks?.configure;
      }),
      dashboardContent: {
        dashboard: {
          worksheets: options.worksheets ?? [
            fakeWorksheet("Shaped", SHAPED),
            fakeWorksheet("Scorecard", OWN_NAMES),
          ],
        },
      },
      settings,
      environment: { mode: options.mode ?? "viewing" },
      ui: {
        displayDialogAsync: vi.fn(async () => {
          if (options.dialog === "closed") {
            throw Object.assign(new Error("Extension dialog closed by user."), {
              errorCode: "dialog-closed-by-user",
            });
          }
          if (options.dialog) {
            values[SETTINGS_KEY] = JSON.stringify(options.dialog);
          }
          return "saved";
        }),
        closeDialog: vi.fn(),
      },
    },
    TableauEventType: {
      FilterChanged: "filter-changed",
      SummaryDataChanged: "summary-data-changed",
      SettingsChanged: "settings-changed",
    },
  } satisfies TableauApi;
  return {
    tableau,
    settings,
    removeSettingsListener,
    configure: () => configure?.(),
    settingsChanged: () => settingsListeners.forEach((l) => l()),
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("startExtension, configured", () => {
  it("registers a configure callback with Tableau", async () => {
    const { tableau } = fakeTableau();
    await startExtension(tableau, view);
    expect(tableau.extensions.initializeAsync).toHaveBeenCalledWith({
      configure: expect.any(Function),
    });
  });

  it("opens the mapping dialog, config.html beside the page, on Configure…", async () => {
    const { tableau, configure } = fakeTableau();
    await startExtension(tableau, view, {
      dialogUrl: "https://vcv.example.com/tableau/config.html",
    });
    configure();
    expect(tableau.extensions.ui.displayDialogAsync).toHaveBeenCalledWith(
      "https://vcv.example.com/tableau/config.html",
      "",
      CONFIGURE_DIALOG,
    );
  });

  it("draws the mapped worksheet with the saved mapping", async () => {
    const { tableau } = fakeTableau({ saved: MAPPING });
    await startExtension(tableau, view);
    expect(view.status.hidden).toBe(true);
    expect(view.visual.rows).toEqual(ROWS);
    const [shaped, scorecard] =
      tableau.extensions.dashboardContent.dashboard.worksheets;
    expect(shaped!.getSummaryDataAsync).not.toHaveBeenCalled();
    expect(scorecard!.getSummaryDataAsync).toHaveBeenCalled();
  });

  it("redraws with the new mapping once the dialog saves it", async () => {
    const { tableau, configure } = fakeTableau({
      worksheets: [fakeWorksheet("Scorecard", OWN_NAMES)],
      dialog: MAPPING,
    });
    await startExtension(tableau, view);
    expect(view.status.textContent).toContain("needs fields named");
    configure();
    await vi.waitFor(() => expect(view.visual.rows).toEqual(ROWS));
    expect(view.status.hidden).toBe(true);
    expect(view.visual.hidden).toBe(false);
  });

  it("listens to the newly mapped worksheet, and not the old one", async () => {
    const { tableau, configure } = fakeTableau({ dialog: MAPPING });
    await startExtension(tableau, view);
    const [shaped, scorecard] =
      tableau.extensions.dashboardContent.dashboard.worksheets;
    const removeShaped = vi.mocked(shaped!.addEventListener).mock.results[0]!
      .value as () => boolean;
    configure();
    await vi.waitFor(() => expect(view.visual.rows).toEqual(ROWS));
    expect(removeShaped).toHaveBeenCalledOnce();
    expect(scorecard!.addEventListener).toHaveBeenCalledOnce();
  });

  it("leaves things as they were when the author closes the dialog", async () => {
    const { tableau, configure } = fakeTableau({ dialog: "closed" });
    await startExtension(tableau, view);
    const before = view.visual.rows;
    configure();
    await settle();
    expect(view.visual.rows).toBe(before);
    expect(view.status.hidden).toBe(true);
  });

  it("re-reads the mapping when the settings change", async () => {
    const { tableau, settingsChanged, settings } = fakeTableau();
    await startExtension(tableau, view);
    settings.set(SETTINGS_KEY, JSON.stringify(MAPPING));
    settingsChanged();
    await vi.waitFor(() => expect(view.visual.rows).toEqual(ROWS));
  });

  it("says so when the mapped worksheet is no longer on the dashboard", async () => {
    const { tableau } = fakeTableau({
      saved: { ...MAPPING, worksheet: "Gone" },
    });
    await startExtension(tableau, view);
    expect(view.status.textContent).toBe(
      'The worksheet "Gone" is no longer on the dashboard. Use Configure… to choose another.',
    );
    expect(view.visual.hidden).toBe(true);
  });

  it("names a mapped field that is gone from the worksheet", async () => {
    const { tableau } = fakeTableau({
      saved: { ...MAPPING, fields: { ...NAMES, metric: "Old KPI Name" } },
    });
    await startExtension(tableau, view);
    expect(view.status.textContent).toBe(
      '"Scorecard" has no field for metric (mapped to "Old KPI Name"). Use Configure… to map it.',
    );
  });

  it("stops listening to the settings too", async () => {
    const { tableau, removeSettingsListener } = fakeTableau();
    const stop = await startExtension(tableau, view);
    stop();
    expect(removeSettingsListener).toHaveBeenCalledOnce();
  });
});

describe("startExtension, opening the dialog by itself", () => {
  it("opens it once when an author adds it to a worksheet without the convention's names", async () => {
    const { tableau } = fakeTableau({
      worksheets: [fakeWorksheet("Scorecard", OWN_NAMES)],
      mode: "authoring",
    });
    await startExtension(tableau, view);
    expect(tableau.extensions.ui.displayDialogAsync).toHaveBeenCalledOnce();
  });

  it("does not when the worksheet already has the convention's names", async () => {
    const { tableau } = fakeTableau({ mode: "authoring" });
    await startExtension(tableau, view);
    expect(view.visual.rows).toEqual(SHAPED_ROWS);
    expect(tableau.extensions.ui.displayDialogAsync).not.toHaveBeenCalled();
  });

  it("does not for a viewer", async () => {
    const { tableau } = fakeTableau({
      worksheets: [fakeWorksheet("Scorecard", OWN_NAMES)],
      mode: "viewing",
    });
    await startExtension(tableau, view);
    expect(tableau.extensions.ui.displayDialogAsync).not.toHaveBeenCalled();
  });

  it("does not once a mapping is saved, even one that no longer fits", async () => {
    const { tableau } = fakeTableau({
      mode: "authoring",
      saved: { ...MAPPING, fields: { ...NAMES, metric: "Old KPI Name" } },
    });
    await startExtension(tableau, view);
    expect(tableau.extensions.ui.displayDialogAsync).not.toHaveBeenCalled();
  });
});
