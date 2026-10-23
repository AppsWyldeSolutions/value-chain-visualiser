import type { ValueChainVisualiserElement } from "@appswyldesolutions/vcv-web-component";
import { missingFields, missingMessage, rowsFromSummaryData } from "./rows.js";
import type { TableauApi, Worksheet } from "./tableau.js";

/** Where the extension draws: the visual, and a line of text for problems. */
export interface ExtensionView {
  visual: ValueChainVisualiserElement;
  status: HTMLElement;
}

/**
 * Starts the dashboard extension: initialises it with Tableau, draws the
 * dashboard's first worksheet in the visual, and draws it again whenever
 * that worksheet's data changes (filters, parameters, edits). Returns a
 * function that stops listening.
 *
 * All drawing is the web component's; this only moves Tableau's data into
 * its `rows`. Problems are shown as text in `status`, never thrown.
 */
export async function startExtension(
  tableau: TableauApi,
  view: ExtensionView,
): Promise<() => void> {
  try {
    await tableau.extensions.initializeAsync();
  } catch (error) {
    showStatus(view, `Could not start the extension: ${message(error)}`);
    return () => {};
  }
  const worksheet =
    tableau.extensions.dashboardContent?.dashboard.worksheets[0];
  if (!worksheet) {
    showStatus(view, "Add a worksheet to the dashboard to show its KPIs.");
    return () => {};
  }

  let loadId = 0;
  const load = async () => {
    const id = ++loadId;
    try {
      const table = await worksheet.getSummaryDataAsync({
        ignoreSelection: true,
      });
      // A newer change since: this reply is stale.
      if (id !== loadId) return;
      // Until the worksheet follows the convention, or while it has no
      // marks, say why rather than draw an empty chain.
      const missing = missingFields(table);
      const problem =
        missing.length > 0
          ? missingMessage(worksheet.name, missing)
          : table.data.length === 0
            ? `"${worksheet.name}" has no marks to show.`
            : "";
      showStatus(view, problem);
      view.visual.hidden = problem !== "";
      if (problem) return;
      // Setting rows on the drawn element redraws it in place.
      view.visual.rows = rowsFromSummaryData(table);
    } catch (error) {
      if (id !== loadId) return;
      showStatus(view, `Could not read "${worksheet.name}": ${message(error)}`);
    }
  };

  const stop = listen(tableau, worksheet, () => void load());
  await load();
  return stop;
}

/**
 * Calls `onChange` when the worksheet's data changes. SummaryDataChanged
 * covers filters, parameters and data edits; Tableau versions before it
 * (API 1.9) only have FilterChanged.
 */
function listen(
  tableau: TableauApi,
  worksheet: Worksheet,
  onChange: () => void,
): () => void {
  const type =
    tableau.TableauEventType.SummaryDataChanged ??
    tableau.TableauEventType.FilterChanged;
  const remove = worksheet.addEventListener(type, onChange);
  return () => void remove();
}

function showStatus(view: ExtensionView, text: string): void {
  view.status.textContent = text;
  view.status.hidden = text === "";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
