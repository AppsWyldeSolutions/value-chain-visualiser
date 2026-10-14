// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createControls, type ControlsValue } from "./controls.js";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const VALUE: ControlsValue = {
  year: 2026,
  period: "August",
  fillColor: "#8fd3f4",
  shortfallColor: "#ff9f40",
};

function build(onChange = vi.fn()) {
  const controls = createControls(document, {
    years: [2025, 2026, 2027],
    periods: MONTHS,
    value: VALUE,
    onChange,
  });
  const { element } = controls;
  const field = <T extends HTMLElement>(name: string) => {
    const input = element.querySelector<T>(
      `.vcv-control--${name} .vcv-control__input`,
    );
    if (!input) throw new Error(`no ${name} control`);
    return input;
  };
  return {
    controls,
    element,
    onChange,
    year: field<HTMLSelectElement>("year"),
    period: field<HTMLSelectElement>("period"),
    fill: field<HTMLInputElement>("fill"),
    shortfall: field<HTMLInputElement>("shortfall"),
  };
}

describe("createControls", () => {
  it("labels the four controls in the prototype's order", () => {
    const { element } = build();
    const labels = Array.from(
      element.querySelectorAll(":scope > label"),
      (label) => label.querySelector(".vcv-control__label")?.textContent,
    );
    expect(labels).toEqual([
      "Year",
      "Period",
      "Fill colour",
      "Shortfall colour",
    ]);
  });

  it("offers the years and periods it is given, with the current ones chosen", () => {
    const { year, period } = build();
    expect(Array.from(year.options, (o) => o.textContent)).toEqual([
      "2025",
      "2026",
      "2027",
    ]);
    expect(year.value).toBe("2026");
    expect(Array.from(period.options, (o) => o.value)).toEqual(MONTHS);
    expect(period.value).toBe("August");
  });

  it("shows the two colours in pickers named for what they colour", () => {
    const { fill, shortfall } = build();
    expect(fill.type).toBe("color");
    expect(fill.value).toBe("#8fd3f4");
    expect(fill.getAttribute("aria-label")).toBe(
      "Fill colour when target is met",
    );
    expect(shortfall.value).toBe("#ff9f40");
    expect(shortfall.getAttribute("aria-label")).toBe(
      "Fill colour when target is missed",
    );
  });

  it("reports a new year or period as it is chosen", () => {
    const { year, period, onChange } = build();
    period.value = "July";
    period.dispatchEvent(new Event("change"));
    expect(onChange).toHaveBeenLastCalledWith({ period: "July" });

    year.value = "2025";
    year.dispatchEvent(new Event("change"));
    expect(onChange).toHaveBeenLastCalledWith({ year: 2025 });
  });

  it("reports a colour while it is being picked", () => {
    const { fill, shortfall, onChange } = build();
    fill.value = "#00ff00";
    fill.dispatchEvent(new Event("input"));
    expect(onChange).toHaveBeenLastCalledWith({ fillColor: "#00ff00" });

    shortfall.value = "#ff00ff";
    shortfall.dispatchEvent(new Event("input"));
    expect(onChange).toHaveBeenLastCalledWith({ shortfallColor: "#ff00ff" });
  });

  it("shows a new value without reporting it as a change", () => {
    const { controls, year, period, fill, onChange } = build();
    controls.update(
      { ...VALUE, year: 2024, period: "July", fillColor: "#ABC" },
      [2023, 2024, 2025],
    );
    expect(Array.from(year.options, (o) => o.value)).toEqual([
      "2023",
      "2024",
      "2025",
    ]);
    expect(year.value).toBe("2024");
    expect(period.value).toBe("July");
    // A short hex is spelt out; the picker only takes #rrggbb.
    expect(fill.value).toBe("#aabbcc");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves a picker alone when the colour is not a hex colour", () => {
    const { controls, fill } = build();
    controls.update({ ...VALUE, fillColor: "rebeccapurple" });
    expect(fill.value).toBe("#8fd3f4");
  });
});
