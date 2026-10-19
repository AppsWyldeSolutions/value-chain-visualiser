// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  KpiRow,
  ValueChainVisualiserElement,
} from "@appswyldesolutions/vcv-web-component";
import { ValueChainVisualiser } from "./index.js";

const ROWS: KpiRow[] = [];
const OTHER_ROWS: KpiRow[] = [];

function host(container: HTMLElement): ValueChainVisualiserElement {
  const element = container.querySelector("value-chain-visualiser");
  if (!element) throw new Error("no <value-chain-visualiser> rendered");
  return element;
}

/** Renders and waits until the element is registered and has its rows. */
async function mount(ui: ReactElement) {
  const result = render(ui);
  const element = host(result.container);
  // Upgraded: the effect's import of the define entry has run. The first
  // import loads the whole web component, which on a loaded machine takes
  // longer than waitFor's default 1s.
  await waitFor(
    () =>
      expect(element.constructor).toBe(
        customElements.get("value-chain-visualiser"),
      ),
    { timeout: 10_000 },
  );
  return { ...result, element };
}

afterEach(cleanup);

describe("<ValueChainVisualiser>", () => {
  it("renders the custom element with its attributes, class and style", async () => {
    const { element } = await mount(
      <ValueChainVisualiser
        rows={ROWS}
        year={2026}
        period="July"
        theme={{ fillColor: "#00ff00", shortfallColor: "#ff0000" }}
        className="chain"
        style={{ minHeight: 400 }}
      />,
    );
    expect(element.getAttribute("data-year")).toBe("2026");
    expect(element.getAttribute("data-period")).toBe("July");
    expect(element.getAttribute("data-fill-color")).toBe("#00ff00");
    expect(element.getAttribute("data-shortfall-color")).toBe("#ff0000");
    expect(element.className).toBe("chain");
    expect(element.style.minHeight).toBe("400px");
  });

  it("registers the element and sets rows as a property once it is upgraded", async () => {
    const { element } = await mount(<ValueChainVisualiser rows={ROWS} />);
    await waitFor(() => expect(element.rows).toBe(ROWS));
    // Through the class's setter, not an own property shadowing it.
    expect(Object.hasOwn(element, "rows")).toBe(false);
    expect(element.hasAttribute("rows")).toBe(false);
  });

  it("updates the same element when props change, and drops removed ones", async () => {
    const { element, rerender, container } = await mount(
      <ValueChainVisualiser rows={ROWS} year={2025} period="June" />,
    );
    await waitFor(() => expect(element.rows).toBe(ROWS));
    rerender(<ValueChainVisualiser rows={OTHER_ROWS} year={2026} />);
    expect(host(container)).toBe(element);
    expect(element.getAttribute("data-year")).toBe("2026");
    expect(element.hasAttribute("data-period")).toBe(false);
    await waitFor(() => expect(element.rows).toBe(OTHER_ROWS));
  });

  it("calls onSelect, onChange and onError with the events' detail", async () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const onError = vi.fn();
    const { element } = await mount(
      <ValueChainVisualiser
        rows={ROWS}
        onSelect={onSelect}
        onChange={onChange}
        onError={onError}
      />,
    );
    const select = { node: "N", metric: "M" };
    const change = { year: 2026, period: "July" };
    const error = new Error("nope");
    act(() => {
      element.dispatchEvent(new CustomEvent("vcv-select", { detail: select }));
      element.dispatchEvent(new CustomEvent("vcv-change", { detail: change }));
      element.dispatchEvent(new CustomEvent("vcv-error", { detail: error }));
    });
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(select);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(change);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("uses a new callback without subscribing again", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { element, rerender } = await mount(
      <ValueChainVisualiser rows={ROWS} onSelect={first} />,
    );
    const add = vi.spyOn(element, "addEventListener");
    rerender(<ValueChainVisualiser rows={ROWS} onSelect={second} />);
    act(() => {
      element.dispatchEvent(new CustomEvent("vcv-select", { detail: {} }));
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(add).not.toHaveBeenCalled();
  });

  it("stops listening when unmounted", async () => {
    const onSelect = vi.fn();
    const { element, unmount } = await mount(
      <ValueChainVisualiser rows={ROWS} onSelect={onSelect} />,
    );
    unmount();
    element.dispatchEvent(new CustomEvent("vcv-select", { detail: {} }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
