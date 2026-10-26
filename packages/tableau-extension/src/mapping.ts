import { FIELDS, type FieldColumns } from "./rows.js";
import type { Settings } from "./tableau.js";

// The field mapping an author makes in the Configure dialog: which worksheet
// to draw, and which of its columns holds each of the visual's fields. It is
// saved in the extension's settings, so it travels with the workbook.

/** The settings key the mapping is saved under. */
export const SETTINGS_KEY = "vcv.mapping";

export interface Mapping {
  /** The worksheet's name on the dashboard. */
  worksheet: string;
  /** Each mapped field's column, by its summary-data name ("SUM(Sales)"). */
  fields: FieldColumns;
}

/**
 * The saved mapping, or undefined when there is none, or none this version
 * can use: the extension then reads the v1 convention.
 */
export function readMapping(
  settings: Settings | undefined,
): Mapping | undefined {
  const value = settings?.get(SETTINGS_KEY);
  if (!value) return undefined;
  let saved: unknown;
  try {
    saved = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!saved || typeof saved !== "object") return undefined;
  const { version, worksheet, fields } = saved as Record<string, unknown>;
  if (version !== 1 || typeof worksheet !== "string" || !worksheet) {
    return undefined;
  }
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return undefined;
  }
  const mapped: FieldColumns = {};
  for (const field of FIELDS) {
    const column = (fields as Record<string, unknown>)[field];
    if (typeof column === "string" && column) mapped[field] = column;
  }
  return { worksheet, fields: mapped };
}

/** Sets the mapping in the settings; the caller saves them (saveAsync). */
export function writeMapping(settings: Settings, mapping: Mapping): void {
  settings.set(SETTINGS_KEY, JSON.stringify({ version: 1, ...mapping }));
}
