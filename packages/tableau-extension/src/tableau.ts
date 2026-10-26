// The part of Tableau's Dashboard Extensions API (1.x) this package uses.
// The API itself is public/lib/tableau.extensions.1.latest.js, loaded by a
// script tag as Tableau intends, so it is not an npm dependency; these
// types describe the window.tableau it sets.

/** One cell of a worksheet's data. `nativeValue` is null for Tableau's nulls. */
export interface DataValue {
  value: unknown;
  nativeValue: unknown;
  formattedValue: string;
}

export interface Column {
  fieldName: string;
  index: number;
}

export interface DataTable {
  columns: Column[];
  data: DataValue[][];
}

export interface TableauEvent {
  type: string;
}

export interface Worksheet {
  name: string;
  getSummaryDataAsync(options?: {
    ignoreSelection?: boolean;
    maxRows?: number;
  }): Promise<DataTable>;
  /** Returns a function that removes the listener. */
  addEventListener(
    type: string,
    handler: (event: TableauEvent) => void,
  ): () => boolean;
}

/** The extension's settings, saved in the workbook. Values are strings. */
export interface Settings {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  saveAsync(): Promise<unknown>;
  addEventListener?(
    type: string,
    handler: (event: TableauEvent) => void,
  ): () => boolean;
}

export interface DialogOptions {
  width?: number;
  height?: number;
}

export interface TableauApi {
  extensions: {
    /** `configure` is called when the author picks Configure… in the zone's menu. */
    initializeAsync(callbacks?: { configure?: () => void }): Promise<unknown>;
    /** For a page opened with ui.displayDialogAsync, in place of initializeAsync. */
    initializeDialogAsync?(): Promise<string>;
    dashboardContent?: { dashboard: { worksheets: Worksheet[] } };
    settings?: Settings;
    environment?: { mode: string };
    ui?: {
      /**
       * Resolves with what the dialog passes closeDialog; rejects with
       * errorCode "dialog-closed-by-user" when the author closes it.
       */
      displayDialogAsync(
        url: string,
        payload?: string,
        options?: DialogOptions,
      ): Promise<string>;
      closeDialog(payload?: string): void;
    };
  };
  TableauEventType: {
    FilterChanged: string;
    SummaryDataChanged?: string;
    SettingsChanged?: string;
  };
}

declare global {
  interface Window {
    tableau?: TableauApi;
  }
}
