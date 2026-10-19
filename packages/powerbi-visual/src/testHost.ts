import type powerbi from "powerbi-visuals-api";
import { vi } from "vitest";

/** A stand-in for a table row's selection id: equal ids share a key. */
function rowId(table: unknown, row: number) {
  const key = `row:${row}`;
  return {
    table,
    row,
    getKey: () => key,
    equals: (other: { getKey(): string }) => other.getKey() === key,
  };
}
type RowId = ReturnType<typeof rowId>;

/**
 * The parts of Power BI's visual host the visual uses: rendering events, and
 * a selection manager that, like Power BI's, replaces the selection on a
 * plain select and adds to it on a multi-select.
 */
export function testHost({ allowInteractions = true } = {}) {
  let selected: RowId[] = [];
  let onSelect: ((ids: RowId[]) => void) | undefined;
  const selectionManager = {
    select: vi.fn(async (id: RowId, multi = false) => {
      const already = selected.some((s) => s.equals(id));
      if (multi) {
        selected = already
          ? selected.filter((s) => !s.equals(id))
          : [...selected, id];
      } else {
        selected = already && selected.length === 1 ? [] : [id];
      }
      return selected;
    }),
    clear: vi.fn(async () => {
      selected = [];
    }),
    getSelectionIds: vi.fn(() => selected),
    registerOnSelectCallback: vi.fn((callback: (ids: RowId[]) => void) => {
      onSelect = callback;
    }),
    hasSelection: () => selected.length > 0,
  };
  const eventService = {
    renderingStarted: vi.fn(),
    renderingFinished: vi.fn(),
    renderingFailed: vi.fn(),
  };
  const host = {
    eventService,
    hostCapabilities: { allowInteractions },
    createSelectionManager: () => selectionManager,
    createSelectionIdBuilder: () => {
      let id: RowId | undefined;
      const builder = {
        withTable(table: unknown, row: number) {
          id = rowId(table, row);
          return builder;
        },
        createSelectionId: () => id!,
      };
      return builder;
    },
  };
  return {
    host: host as unknown as powerbi.extensibility.visual.IVisualHost,
    eventService,
    selectionManager,
    /** As Power BI does when the host changes the selection (bookmarks). */
    hostSelects(ids: RowId[]) {
      selected = ids;
      onSelect?.(ids);
    },
    rowId,
  };
}
