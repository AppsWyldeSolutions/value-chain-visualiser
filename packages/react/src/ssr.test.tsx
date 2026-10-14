// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ValueChainVisualiser } from "./index.js";

// What Next.js does with a client component on the server: no DOM at all.
describe("<ValueChainVisualiser> on the server", () => {
  it("renders the bare tag without touching the DOM", () => {
    expect(typeof globalThis.HTMLElement).toBe("undefined");
    const html = renderToString(
      <ValueChainVisualiser
        rows={[]}
        year={2026}
        period="July"
        theme={{ fillColor: "#00ff00" }}
      />,
    );
    expect(html).toBe(
      '<value-chain-visualiser data-year="2026" data-period="July" data-fill-color="#00ff00"></value-chain-visualiser>',
    );
  });
});
