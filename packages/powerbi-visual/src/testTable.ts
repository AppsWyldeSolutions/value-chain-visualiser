import type { KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";
import { FIELDS } from "./rows";

/** A Power BI table data view holding `rows`, one column per KpiRow field. */
export function tableOf(
  rows: KpiRow[],
  fields: readonly (keyof KpiRow)[] = FIELDS,
): powerbi.DataViewTable {
  return {
    columns: fields.map((field, index) => ({
      displayName: field,
      queryName: `Kpis.${field}`,
      index,
      roles: { fields: true },
    })),
    rows: rows.map((row) => fields.map((field) => row[field])),
  };
}
