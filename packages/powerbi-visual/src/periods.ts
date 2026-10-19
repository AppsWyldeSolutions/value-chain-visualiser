"use strict";

import type { KpiRow } from "@appswyldesolutions/vcv-core";
import { defaultSelection } from "@appswyldesolutions/vcv-renderer";

/**
 * What to say when the rows span more than one period (the Year and Period
 * slicers are cleared or allow several): which period the visual shows (the
 * latest with actuals, as `defaultSelection` picks it) and how many periods
 * there are. Every (year, period) in the rows counts, including those whose
 * actuals are empty: an empty actual is a value too. Null for one period.
 */
export function periodNotice(rows: KpiRow[]): string | null {
  const periods = new Set(rows.map((row) => `${row.year} ${row.period}`));
  if (periods.size < 2) return null;
  const { year, period } = defaultSelection(rows);
  const measured = rows.some((row) => row.actual !== null);
  const which = measured ? ", the latest with actuals" : "";
  return `Showing ${period} ${year}${which} of ${periods.size} periods in the data. Use the Year and Period slicers to pick one.`;
}
