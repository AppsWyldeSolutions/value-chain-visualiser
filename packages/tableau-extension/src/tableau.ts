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
  }): Promise<DataTable>;
  /** Returns a function that removes the listener. */
  addEventListener(
    type: string,
    handler: (event: TableauEvent) => void,
  ): () => boolean;
}

export interface TableauApi {
  extensions: {
    initializeAsync(): Promise<unknown>;
    dashboardContent?: { dashboard: { worksheets: Worksheet[] } };
  };
  TableauEventType: {
    FilterChanged: string;
    SummaryDataChanged?: string;
  };
}

declare global {
  interface Window {
    tableau?: TableauApi;
  }
}
