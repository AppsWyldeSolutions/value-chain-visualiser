// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildModel, fromLongRows } from "@appswyldesolutions/vcv-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTransferPoints } from "./transferPoints.js";

// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
const model = buildModel(
  fromLongRows(
    (
      JSON.parse(
        readFileSync(
          path.resolve(__dirname, "../../../fixtures/bobos-big-block.json"),
          "utf8",
        ),
      ) as { records: unknown[] }
    ).records,
  ),
  { year: 2026, period: "August" },
);
const from = model.nodes.find((node) => node.transferPoints.length > 0)!;

function build() {
  const points = createTransferPoints(document, from, model.nodes[1]);
  document.body.appendChild(points.element);
  const popover = points.element.querySelector<HTMLElement>(".vcv-popover")!;
  return { points, trigger: points.element, popover };
}
const fire = (target: EventTarget, type: string) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true }));

afterEach(() => {
  document.body.replaceChildren();
});

describe("transfer points: hover previews, click pins", () => {
  it("previews on hover and hides when the pointer leaves", () => {
    const { trigger, popover } = build();
    fire(trigger, "mouseenter");
    expect(popover.hidden).toBe(false);
    fire(trigger, "mouseleave");
    expect(popover.hidden).toBe(true);
  });

  it("stays open after a click until clicked again", () => {
    const { trigger, popover } = build();
    fire(trigger, "mouseenter");
    fire(trigger, "click");
    fire(trigger, "mouseleave");
    expect(popover.hidden).toBe(false);
    expect(trigger.classList.contains("vcv-transfer--pinned")).toBe(true);
    fire(trigger, "click");
    expect(popover.hidden).toBe(true);
  });

  it("unpins on Escape or a click elsewhere", () => {
    const { trigger, popover } = build();
    fire(trigger, "click");
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(popover.hidden).toBe(true);

    fire(trigger, "click");
    fire(document.body, "click");
    expect(popover.hidden).toBe(true);
  });

  it("stays pinned for clicks inside its own popover", () => {
    const { trigger, popover } = build();
    fire(trigger, "click");
    fire(popover, "click");
    expect(popover.hidden).toBe(false);
  });

  it("says when it pins, so other popups can close", () => {
    const { trigger } = build();
    const pinned = vi.fn();
    document.body.addEventListener("vcv-transfer-pin", pinned);
    fire(trigger, "click");
    expect(pinned).toHaveBeenCalledTimes(1);
    fire(trigger, "click");
    expect(pinned).toHaveBeenCalledTimes(1);
  });

  it("can be unpinned from outside", () => {
    const { points, trigger, popover } = build();
    fire(trigger, "click");
    points.unpin();
    expect(popover.hidden).toBe(true);
    expect(trigger.classList.contains("vcv-transfer--pinned")).toBe(false);
  });
});

describe("transfer points in a shadow root", () => {
  it("stays pinned: the document sees the click on the host, not outside", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const points = createTransferPoints(document, from, model.nodes[1]);
    shadow.appendChild(points.element);
    points.element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    const popover = points.element.querySelector<HTMLElement>(".vcv-popover")!;
    expect(popover.hidden).toBe(false);
  });
});
