import { createVisual } from "@appswyldesolutions/vcv-renderer";
import { loadRows } from "./processes.js";

// The whole visual, controls included; ?fixture=<name> picks the data.
export function renderVisual(app: HTMLElement): void {
  const fixture = new URLSearchParams(location.search).get("fixture");
  createVisual(app, { rows: loadRows(fixture ?? undefined) });
}
