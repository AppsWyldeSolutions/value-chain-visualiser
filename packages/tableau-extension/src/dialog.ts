import { renderConfigForm, type WorksheetColumns } from "./configure.js";
import { readMapping, writeMapping } from "./mapping.js";
import type { TableauApi } from "./tableau.js";

/** What the dialog passes closeDialog: the extension re-reads its settings. */
export const SAVED = "saved";
export const CANCELLED = "cancelled";

/**
 * Runs the Configure dialog (config.html), which Tableau opens in its own
 * window for the extension's Configure… menu item: lists each worksheet's
 * columns, and on Save writes the mapping to the extension's settings,
 * saves them, and closes. Problems are shown as text, never thrown.
 */
export async function startDialog(
  tableau: TableauApi,
  root: HTMLElement,
): Promise<void> {
  const { extensions } = tableau;
  let worksheets: WorksheetColumns[];
  try {
    if (!extensions.initializeDialogAsync) {
      throw new Error("this Tableau has no extension dialogs");
    }
    await extensions.initializeDialogAsync();
    worksheets = await Promise.all(
      (extensions.dashboardContent?.dashboard.worksheets ?? []).map(
        async (worksheet) => {
          // The columns are all the dialog needs, not every mark.
          const table = await worksheet.getSummaryDataAsync({
            ignoreSelection: true,
            maxRows: 1,
          });
          return {
            name: worksheet.name,
            columns: table.columns.map((column) => column.fieldName),
          };
        },
      ),
    );
  } catch (error) {
    root.textContent = `Could not open the configuration: ${error instanceof Error ? error.message : String(error)}`;
    return;
  }

  const { settings, ui } = extensions;
  renderConfigForm(root, {
    worksheets,
    mapping: readMapping(settings),
    onSave: async (mapping) => {
      if (!settings) throw new Error("this Tableau has no extension settings");
      writeMapping(settings, mapping);
      await settings.saveAsync();
      ui?.closeDialog(SAVED);
    },
    onCancel: () => ui?.closeDialog(CANCELLED),
  });
}
