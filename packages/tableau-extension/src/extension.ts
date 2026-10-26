import type { ValueChainVisualiserElement } from "@appswyldesolutions/vcv-web-component";
import { readMapping, type Mapping } from "./mapping.js";
import {
  missingFields,
  missingMessage,
  rowsFromSummaryData,
  type Field,
} from "./rows.js";
import type { DialogOptions, TableauApi, Worksheet } from "./tableau.js";

/** Where the extension draws: the visual, and a line of text for problems. */
export interface ExtensionView {
  visual: ValueChainVisualiserElement;
  status: HTMLElement;
}

export interface ExtensionOptions {
  /** The Configure dialog's page; config.html beside this page by default. */
  dialogUrl?: string;
}

/** The Configure dialog's size, in pixels. */
export const CONFIGURE_DIALOG: DialogOptions = { width: 560, height: 720 };

/**
 * Starts the dashboard extension: initialises it with Tableau, draws a
 * worksheet in the visual, and draws it again whenever that worksheet's data
 * changes (filters, parameters, edits). Returns a function that stops
 * listening.
 *
 * The worksheet and its fields are the author's mapping from the Configure
 * dialog (Configure… in the zone's menu), when there is one; without it, the
 * dashboard's first worksheet, read by the v1 convention's field names. An
 * author who adds the extension to a worksheet without those names gets the
 * dialog straight away.
 *
 * All drawing is the web component's; this only moves Tableau's data into
 * its `rows`. Problems are shown as text in `status`, never thrown.
 */
export async function startExtension(
  tableau: TableauApi,
  view: ExtensionView,
  options: ExtensionOptions = {},
): Promise<() => void> {
  const { extensions } = tableau;
  const dialogUrl =
    options.dialogUrl ?? new URL("config.html", location.href).href;

  let mapping: Mapping | undefined;
  let worksheet: Worksheet | undefined;
  let stopWorksheet = () => {};
  let loadId = 0;

  /** Draws the worksheet; resolves with the required fields it lacks. */
  const load = async (): Promise<Field[]> => {
    if (!worksheet) return [];
    const { name } = worksheet;
    const id = ++loadId;
    try {
      const table = await worksheet.getSummaryDataAsync({
        ignoreSelection: true,
      });
      // A newer change since: this reply is stale.
      if (id !== loadId) return [];
      // Until the worksheet has every field, or while it has no marks, say
      // why rather than draw an empty chain.
      const missing = missingFields(table, mapping?.fields);
      const problem =
        missing.length > 0
          ? missingMessage(name, missing, mapping?.fields)
          : table.data.length === 0
            ? `"${name}" has no marks to show.`
            : "";
      showProblem(view, problem);
      if (problem) return missing;
      // Setting rows on the drawn element redraws it in place.
      view.visual.rows = rowsFromSummaryData(table, mapping?.fields);
    } catch (error) {
      if (id === loadId) {
        showStatus(view, `Could not read "${name}": ${message(error)}`);
      }
    }
    return [];
  };

  /**
   * Picks the worksheet the mapping names (the first without one) and
   * listens to it; false, saying why, when there is none.
   */
  const select = (): boolean => {
    const worksheets = extensions.dashboardContent?.dashboard.worksheets ?? [];
    const next = mapping
      ? worksheets.find((w) => w.name === mapping!.worksheet)
      : worksheets[0];
    if (next !== worksheet) {
      stopWorksheet();
      stopWorksheet = next
        ? listen(tableau, next, () => void load())
        : () => {};
      worksheet = next;
    }
    if (next) return true;
    // A read still on its way is for a worksheet no longer drawn.
    loadId++;
    showProblem(
      view,
      mapping
        ? `The worksheet "${mapping.worksheet}" is no longer on the dashboard. Use Configure… to choose another.`
        : "Add a worksheet to the dashboard to show its KPIs.",
    );
    return false;
  };

  /** Reads the saved mapping again, and draws what it now says. */
  const reconfigure = async () => {
    mapping = readMapping(extensions.settings);
    if (select()) await load();
  };

  let configuring = false;
  /** Opens the Configure dialog; once it saves, draws the new mapping. */
  const configure = async () => {
    if (!extensions.ui || configuring) return;
    configuring = true;
    try {
      await extensions.ui.displayDialogAsync(dialogUrl, "", CONFIGURE_DIALOG);
    } catch (error) {
      if (errorCode(error) !== "dialog-closed-by-user") {
        showStatus(view, `Could not open the configuration: ${message(error)}`);
      }
      return;
    } finally {
      configuring = false;
    }
    await reconfigure();
  };

  try {
    await extensions.initializeAsync({ configure: () => void configure() });
  } catch (error) {
    showStatus(view, `Could not start the extension: ${message(error)}`);
    return () => {};
  }

  // Saved by the dialog, or by another author's edit to the workbook.
  const stopSettings =
    extensions.settings?.addEventListener?.(
      tableau.TableauEventType.SettingsChanged ?? "settings-changed",
      () => void reconfigure(),
    ) ?? (() => true);

  mapping = readMapping(extensions.settings);
  if (select()) {
    const missing = await load();
    if (
      extensions.environment?.mode === "authoring" &&
      !mapping &&
      missing.length > 0
    ) {
      void configure();
    }
  }
  return () => {
    stopWorksheet();
    stopSettings();
  };
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

/** Shows `text` in place of the visual, or the visual when it is empty. */
function showProblem(view: ExtensionView, text: string): void {
  showStatus(view, text);
  view.visual.hidden = text !== "";
}

function showStatus(view: ExtensionView, text: string): void {
  view.status.textContent = text;
  view.status.hidden = text === "";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): unknown {
  return error && typeof error === "object" && "errorCode" in error
    ? error.errorCode
    : undefined;
}
