import { createVisual } from "@appswyldesolutions/vcv-renderer";
import { loadRows } from "./processes.js";

// The whole visual, controls included; ?fixture=<name> picks the data and
// ?display=full|compact the card display (compact by default).
export function renderVisual(app: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const fixture = params.get("fixture");
  createVisual(app, {
    rows: loadRows(fixture ?? undefined),
    cardDisplay: params.get("display") === "full" ? "full" : "compact",
  });
}
