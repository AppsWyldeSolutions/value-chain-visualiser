// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

// One file, one jsdom: the registry starts empty, so the order below matters.
describe("package entries", () => {
  it("the root entry exports the element without registering it", async () => {
    const root = await import("./index.js");
    expect(root.ValueChainVisualiserElement).toBeTypeOf("function");
    expect(root.defineValueChainVisualiser).toBeTypeOf("function");
    expect(customElements.get("value-chain-visualiser")).toBeUndefined();
  });

  it("the define entry registers <value-chain-visualiser>", async () => {
    const root = await import("./index.js");
    const define = await import("./define.js");
    expect(customElements.get("value-chain-visualiser")).toBe(
      root.ValueChainVisualiserElement,
    );
    expect(define.ValueChainVisualiserElement).toBe(
      root.ValueChainVisualiserElement,
    );
  });
});
