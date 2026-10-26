// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDialog } from "./dialog.js";
import { readMapping, SETTINGS_KEY } from "./mapping.js";
import type { DataTable, Settings, TableauApi, Worksheet } from "./tableau.js";

// The Configure dialog's page (config.html), which Tableau opens in its own
// window: it lists each worksheet's columns and saves the chosen mapping.
const table = (...names: string[]): DataTable => ({
  columns: names.map((fieldName, index) => ({ fieldName, index })),
  data: [],
});

function worksheet(name: string, data: DataTable): Worksheet {
  return {
    name,
    getSummaryDataAsync: vi.fn(async () => data),
    addEventListener: vi.fn(() => () => true),
  };
}

function fakeTableau(values: Record<string, string> = {}) {
  const settings: Settings = {
    get: vi.fn((key: string) => values[key]),
    set: vi.fn((key: string, value: string) => {
      values[key] = value;
    }),
    saveAsync: vi.fn(async () => values),
  };
  const tableau = {
    extensions: {
      initializeAsync: vi.fn(async () => undefined),
      initializeDialogAsync: vi.fn(async () => ""),
      dashboardContent: {
        dashboard: {
          worksheets: [
            worksheet("Shaped", table("node", "metric", "SUM(actual)")),
            worksheet("Scorecard", table("Process", "KPI Name")),
          ],
        },
      },
      settings,
      ui: {
        displayDialogAsync: vi.fn(async () => ""),
        closeDialog: vi.fn(),
      },
    },
    TableauEventType: { FilterChanged: "filter-changed" },
  } satisfies TableauApi;
  return { tableau, settings, values };
}

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement("main");
  document.body.append(root);
});

afterEach(() => {
  document.body.replaceChildren();
});

const select = (name: string) =>
  root.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;

describe("startDialog", () => {
  it("initialises as a dialog, then lists each worksheet's columns", async () => {
    const { tableau } = fakeTableau();
    await startDialog(tableau, root);
    expect(tableau.extensions.initializeDialogAsync).toHaveBeenCalledOnce();
    expect(tableau.extensions.initializeAsync).not.toHaveBeenCalled();
    expect([...select("worksheet").options].map((o) => o.value)).toEqual([
      "Shaped",
      "Scorecard",
    ]);
    expect([...select("node").options].map((o) => o.value)).toEqual([
      "",
      "node",
      "metric",
      "SUM(actual)",
    ]);
  });

  it("asks Tableau for the columns, not for every mark", async () => {
    const { tableau } = fakeTableau();
    await startDialog(tableau, root);
    const [first] = tableau.extensions.dashboardContent.dashboard.worksheets;
    expect(first!.getSummaryDataAsync).toHaveBeenCalledWith({
      ignoreSelection: true,
      maxRows: 1,
    });
  });

  it("starts from the saved mapping", async () => {
    const { tableau } = fakeTableau({
      [SETTINGS_KEY]: JSON.stringify({
        version: 1,
        worksheet: "Scorecard",
        fields: { node: "Process" },
      }),
    });
    await startDialog(tableau, root);
    expect(select("worksheet").value).toBe("Scorecard");
    expect(select("node").value).toBe("Process");
  });

  it("saves the mapping to the extension's settings, then closes", async () => {
    const { tableau, settings } = fakeTableau();
    await startDialog(tableau, root);
    for (const name of ["group", "year", "period", "budget"]) {
      select(name).append(new Option(name, name));
      select(name).value = name;
    }
    root.querySelector("form")!.dispatchEvent(new Event("change"));
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await vi.waitFor(() =>
      expect(tableau.extensions.ui.closeDialog).toHaveBeenCalledWith("saved"),
    );
    expect(settings.saveAsync).toHaveBeenCalledOnce();
    expect(readMapping(settings)).toMatchObject({
      worksheet: "Shaped",
      fields: { node: "node", metric: "metric", actual: "SUM(actual)" },
    });
  });

  it("closes without saving on Cancel", async () => {
    const { tableau, settings } = fakeTableau();
    await startDialog(tableau, root);
    root.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    expect(tableau.extensions.ui.closeDialog).toHaveBeenCalledWith("cancelled");
    expect(settings.saveAsync).not.toHaveBeenCalled();
  });

  it("says so when the settings cannot be saved, and stays open", async () => {
    const { tableau, settings } = fakeTableau();
    vi.mocked(settings.saveAsync).mockRejectedValue(new Error("read only"));
    await startDialog(tableau, root);
    for (const name of ["group", "year", "period", "budget"]) {
      select(name).append(new Option(name, name));
      select(name).value = name;
    }
    root.querySelector("form")!.dispatchEvent(new Event("change"));
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain("Could not save: read only"),
    );
    expect(tableau.extensions.ui.closeDialog).not.toHaveBeenCalled();
  });

  it("says so when Tableau will not open the dialog", async () => {
    const { tableau } = fakeTableau();
    tableau.extensions.initializeDialogAsync.mockRejectedValue(
      new Error("not in Tableau"),
    );
    await startDialog(tableau, root);
    expect(root.textContent).toBe(
      "Could not open the configuration: not in Tableau",
    );
  });
});
