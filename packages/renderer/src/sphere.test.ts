// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createSphere, type SphereState } from "./sphere.js";

// The six states of issue #7, as core's evaluate() reports them.
const STATES: Record<string, SphereState> = {
  met: { level: 0.7, met: true, hasData: true },
  short: { level: 0.44, met: false, hasData: true },
  exceeded: { level: 1, met: true, hasData: true },
  full: { level: 1, met: false, hasData: true },
  empty: { level: 0, met: false, hasData: true },
  noData: { level: 0, met: false, hasData: false },
};

function build(state: SphereState | undefined) {
  if (!state) throw new Error("unknown state");
  return createSphere(document, state);
}

function modifiers(element: HTMLElement): string[] {
  return Array.from(element.classList)
    .filter((name) => name.startsWith("vcv-sphere--"))
    .map((name) => name.replace("vcv-sphere--", ""))
    .sort();
}

function level(element: HTMLElement): string {
  return element.style.getPropertyValue("--vcv-sphere-level");
}

describe("createSphere", () => {
  it("builds the liquid, meniscus and two highlights inside the shell", () => {
    const { element } = build(STATES.met);
    expect(element.classList.contains("vcv-sphere")).toBe(true);
    const liquid = element.querySelector(".vcv-sphere__liquid");
    expect(liquid?.querySelector(".vcv-sphere__meniscus")).not.toBeNull();
    expect(element.querySelectorAll(".vcv-sphere__highlight")).toHaveLength(2);
    expect(
      element.querySelectorAll(".vcv-sphere__highlight--low"),
    ).toHaveLength(1);
  });

  it("met: fill colour, partly filled with a meniscus", () => {
    const { element } = build(STATES.met);
    expect(modifiers(element)).toEqual(["met", "partial"]);
    expect(level(element)).toBe("70.0%");
  });

  it("short: shortfall colour, filled to actual / budget", () => {
    const { element } = build(STATES.short);
    expect(modifiers(element)).toEqual(["missed", "partial"]);
    expect(level(element)).toBe("44.0%");
  });

  it("exceeded: fill colour, full sphere, no meniscus", () => {
    const { element } = build(STATES.exceeded);
    expect(modifiers(element)).toEqual(["met"]);
    expect(level(element)).toBe("100.0%");
  });

  it("full: shortfall colour, full sphere, no meniscus", () => {
    const { element } = build(STATES.full);
    expect(modifiers(element)).toEqual(["missed"]);
    expect(level(element)).toBe("100.0%");
  });

  it("empty: has data but no liquid and no meniscus", () => {
    const { element } = build(STATES.empty);
    expect(modifiers(element)).toEqual(["missed"]);
    expect(level(element)).toBe("0.0%");
  });

  it("no data: dashed empty sphere in neither colour", () => {
    const { element } = build(STATES.noData);
    expect(modifiers(element)).toEqual(["no-data"]);
    expect(level(element)).toBe("0.0%");
  });

  it("ignores the level and met flag when there is no data", () => {
    const { element } = createSphere(document, {
      level: 0.5,
      met: true,
      hasData: false,
    });
    expect(modifiers(element)).toEqual(["no-data"]);
    expect(level(element)).toBe("0.0%");
  });

  it("clamps the level to a full or empty sphere", () => {
    const over = createSphere(document, { ...STATES.met!, level: 1.4 });
    expect(level(over.element)).toBe("100.0%");
    expect(modifiers(over.element)).toEqual(["met"]);

    const under = createSphere(document, { ...STATES.met!, level: -0.2 });
    expect(level(under.element)).toBe("0.0%");

    const invalid = createSphere(document, { ...STATES.met!, level: NaN });
    expect(level(invalid.element)).toBe("0.0%");
  });

  it("takes its size from the theme unless one is given", () => {
    const themed = build(STATES.met);
    expect(themed.element.style.getPropertyValue("--vcv-sphere-size")).toBe("");

    const sized = createSphere(document, STATES.met!, { size: "132px" });
    expect(sized.element.style.getPropertyValue("--vcv-sphere-size")).toBe(
      "132px",
    );
  });

  it("is hidden from assistive tech unless it is given a label", () => {
    const plain = build(STATES.met);
    expect(plain.element.getAttribute("aria-hidden")).toBe("true");
    expect(plain.element.hasAttribute("role")).toBe(false);

    const labelled = createSphere(document, STATES.met!, {
      label: "<b>70%</b> of budget",
    });
    expect(labelled.element.getAttribute("role")).toBe("img");
    expect(labelled.element.getAttribute("aria-label")).toBe(
      "<b>70%</b> of budget",
    );
    expect(labelled.element.hasAttribute("aria-hidden")).toBe(false);
    expect(labelled.element.querySelector("b")).toBeNull();
  });

  it("moves between states on update", () => {
    const sphere = build(STATES.short);
    sphere.update(STATES.exceeded!);
    expect(modifiers(sphere.element)).toEqual(["met"]);
    expect(level(sphere.element)).toBe("100.0%");

    sphere.update(STATES.noData!);
    expect(modifiers(sphere.element)).toEqual(["no-data"]);
    expect(level(sphere.element)).toBe("0.0%");
  });
});
