import type { KpiRow } from "@appswyldesolutions/vcv-core";
import type powerbi from "powerbi-visuals-api";

/**
 * The field names a report might give its columns: what a viewer drops into
 * each data role, as they appear in the API's long rows.
 */
export const REPORT_NAMES: Record<keyof KpiRow, string> = {
  node: "link",
  nodeOrder: "Link order",
  group: "group",
  subGroup: "subGroup",
  metric: "metric",
  operator: "kpiOperator",
  valueType: "metricValueType",
  symbol: "kpiSymbol",
  year: "year",
  period: "period",
  actual: "Sum of actual",
  budget: "Sum of budget",
};

/**
 * `rows` as Power BI's table data view would hold them: one column per data
 * role (the role named after the KpiRow field), in the order `roles` gives,
 * titled with the report's field names.
 */
export function tableOf(
  rows: KpiRow[],
  roles: readonly (keyof KpiRow)[] = Object.keys(
    REPORT_NAMES,
  ) as (keyof KpiRow)[],
): powerbi.DataViewTable {
  return {
    columns: roles.map((role, index) => ({
      displayName: REPORT_NAMES[role],
      queryName: `Kpis.${REPORT_NAMES[role]}`,
      index,
      roles: { [role]: true },
    })),
    rows: rows.map((row) => roles.map((role) => row[role])),
  };
}
