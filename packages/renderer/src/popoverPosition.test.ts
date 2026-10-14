import { describe, expect, it } from "vitest";
import { popoverPosition } from "./popoverPosition.js";

// A 1440 x 900 viewport, a 420 x 260 popover and an 8px margin.
const BOUNDS = { left: 0, top: 0, width: 1440, height: 900 };
const SIZE = { width: 420, height: 260 };
const MARGIN = 8;

describe("popoverPosition", () => {
  it("centres the popover under its anchor", () => {
    const anchor = { left: 700, top: 300, width: 56, height: 48 };
    expect(popoverPosition(anchor, SIZE, BOUNDS, MARGIN)).toEqual({
      left: 518,
      top: 348,
      placement: "below",
    });
  });

  it("keeps the margin from the left and right edges", () => {
    const nearLeft = { left: 10, top: 300, width: 48, height: 64 };
    expect(popoverPosition(nearLeft, SIZE, BOUNDS, MARGIN).left).toBe(8);

    const nearRight = { left: 1380, top: 300, width: 48, height: 64 };
    expect(popoverPosition(nearRight, SIZE, BOUNDS, MARGIN).left).toBe(
      1440 - 8 - 420,
    );
  });

  it("flips above the anchor when there is no room below", () => {
    const anchor = { left: 700, top: 700, width: 56, height: 48 };
    expect(popoverPosition(anchor, SIZE, BOUNDS, MARGIN)).toEqual({
      left: 518,
      top: 440,
      placement: "above",
    });
  });

  it("takes the roomier side and stays inside when neither side fits", () => {
    const short = { left: 0, top: 0, width: 1440, height: 400 };
    // 150px above the anchor, 202px below it: below is roomier, but the
    // popover has to ride up over the anchor to stay inside.
    const anchor = { left: 700, top: 150, width: 56, height: 48 };
    expect(popoverPosition(anchor, SIZE, short, MARGIN)).toEqual({
      left: 518,
      top: 400 - 8 - 260,
      placement: "below",
    });

    const low = { left: 700, top: 250, width: 56, height: 48 };
    expect(popoverPosition(low, SIZE, short, MARGIN)).toEqual({
      left: 518,
      top: 8,
      placement: "above",
    });
  });

  it("pins a popover wider than the bounds to the left margin", () => {
    const narrow = { left: 0, top: 0, width: 400, height: 900 };
    const anchor = { left: 176, top: 300, width: 48, height: 64 };
    expect(popoverPosition(anchor, SIZE, narrow, MARGIN).left).toBe(8);
  });

  it("respects bounds that do not start at the origin", () => {
    const inset = { left: 100, top: 50, width: 600, height: 500 };
    const anchor = { left: 110, top: 400, width: 48, height: 64 };
    expect(popoverPosition(anchor, SIZE, inset, MARGIN)).toEqual({
      left: 108,
      top: 140,
      placement: "above",
    });
  });
});
