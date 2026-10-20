// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defineValueChainVisualiser,
  ValueChainVisualiserElement,
  type VcvSelectDetail,
} from "./element.js";

// __dirname, not import.meta.url: under jsdom that URL is not a file: one.
function fixtureText(name: string): string {
  return readFileSync(
    path.resolve(__dirname, "../../../fixtures", name),
    "utf8",
  );
}
const LONG = fixtureText("bobos-big-block.json");
const WIDE = fixtureText("main-dc-prototype.json");

const fetchMock = vi.fn<(url: string) => Promise<Response>>();

function respond(body: string, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(body, {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((url) =>
    url.includes("main-dc-prototype") ? respond(WIDE) : respond(LONG),
  );
  vi.stubGlobal("fetch", fetchMock);
  defineValueChainVisualiser();
});

afterEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
  vi.unstubAllGlobals();
});

function mount(attributes: Record<string, string> = {}) {
  const element = document.createElement(
    "value-chain-visualiser",
  ) as ValueChainVisualiserElement;
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  document.body.appendChild(element);
  return element;
}

function shadow(element: HTMLElement): ShadowRoot {
  if (!element.shadowRoot) throw new Error("no shadow root");
  return element.shadowRoot;
}

/** The links drawn: compact bars, or full cards. */
const links = (element: HTMLElement) =>
  shadow(element).querySelectorAll(".vcv-grid > .vcv-card, .vcv-grid .vcv-bar");

/** Waits until the element has rendered its links (or gives up). */
async function rendered(element: HTMLElement, cards = 9): Promise<void> {
  await vi.waitFor(() => {
    expect(links(element)).toHaveLength(cards);
  });
}

function subtitle(element: HTMLElement): string | null | undefined {
  return shadow(element).querySelector(".vcv-header__subtitle")?.textContent;
}

describe("defineValueChainVisualiser", () => {
  it("registers <value-chain-visualiser>, and is safe to call again", () => {
    defineValueChainVisualiser();
    expect(customElements.get("value-chain-visualiser")).toBe(
      ValueChainVisualiserElement,
    );
  });
});

describe("<value-chain-visualiser>", () => {
  it("loads long-row data through data-src", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/data/bobos-big-block.json");
    expect(subtitle(element)).toBe(
      "August 2026 · 53 KPIs measured against budget",
    );
    expect(
      shadow(element).querySelectorAll(".vcv-card--score, .vcv-bar--score"),
    ).toHaveLength(1);
  });

  it("loads the prototype's wide records through data-src", async () => {
    const element = mount({ "data-src": "/data/main-dc-prototype.json" });
    await rendered(element);
    expect(subtitle(element)).toBe(
      "August 2026 · 53 KPIs measured against budget",
    );
  });

  it("takes a bare array of long rows too", async () => {
    const records = (JSON.parse(LONG) as { records: unknown[] }).records;
    fetchMock.mockImplementation(() => respond(JSON.stringify(records)));
    const element = mount({ "data-src": "/rows.json" });
    await rendered(element);
  });

  it("draws inside its own shadow root, with the styles there", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    expect(element.querySelector(".vcv-root")).toBeNull();
    expect(
      shadow(element).querySelector("style[data-vcv-styles]"),
    ).not.toBeNull();
    expect(document.head.querySelector("style[data-vcv-fonts]")).not.toBeNull();
  });

  it("opens on data-year and data-period when given", async () => {
    const element = mount({
      "data-src": "/data/bobos-big-block.json",
      "data-year": "2026",
      "data-period": "July",
    });
    await rendered(element);
    expect(subtitle(element)).toBe(
      "July 2026 · 53 KPIs measured against budget",
    );
  });

  it("follows a later change of data-period", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    element.setAttribute("data-period", "March");
    expect(subtitle(element)).toBe(
      "March 2026 · 53 KPIs measured against budget",
    );
  });

  it("takes its two colours from data attributes", async () => {
    const element = mount({
      "data-src": "/data/bobos-big-block.json",
      "data-fill-color": "#00aa55",
    });
    await rendered(element);
    const root = shadow(element).querySelector<HTMLElement>(".vcv-root");
    expect(root?.style.getPropertyValue("--vcv-fill-color")).toBe("#00aa55");

    element.setAttribute("data-shortfall-color", "#cc2266");
    expect(root?.style.getPropertyValue("--vcv-shortfall-color")).toBe(
      "#cc2266",
    );
  });

  it("loads again when data-src changes, ignoring a reply that arrives late", async () => {
    let releaseFirst: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          releaseFirst = resolve;
        }),
    );
    const element = mount({ "data-src": "/slow.json" });
    // Before the first reply, point it at data with only one link.
    const bu1 = (
      JSON.parse(LONG) as { records: { link: string }[] }
    ).records.filter((record) => record.link.startsWith("BU1"));
    fetchMock.mockImplementationOnce(() =>
      respond(JSON.stringify({ records: bu1 })),
    );
    element.setAttribute("data-src", "/fast.json");
    await rendered(element, 1);

    releaseFirst(new Response(LONG));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(links(element)).toHaveLength(1);
  });

  it("fires vcv-error when the data cannot be loaded", async () => {
    fetchMock.mockImplementation(() => respond("Not found", 404));
    const element = document.createElement("value-chain-visualiser");
    const errors: unknown[] = [];
    element.addEventListener("vcv-error", (event) =>
      errors.push((event as CustomEvent).detail),
    );
    element.setAttribute("data-src", "/missing.json");
    document.body.appendChild(element);
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(String((errors[0] as { message: string }).message)).toContain("404");
  });

  it("fires vcv-error for data in neither shape", async () => {
    fetchMock.mockImplementation(() => respond(JSON.stringify({ rows: 1 })));
    const element = document.createElement("value-chain-visualiser");
    const errors: unknown[] = [];
    element.addEventListener("vcv-error", (event) =>
      errors.push((event as CustomEvent).detail),
    );
    element.setAttribute("data-src", "/odd.json");
    document.body.appendChild(element);
    await vi.waitFor(() => expect(errors).toHaveLength(1));
  });

  it("takes rows set directly, without fetching", async () => {
    const element = mount();
    const { fromLongRows } = await import("@appswyldesolutions/vcv-core");
    element.rows = fromLongRows(
      (JSON.parse(LONG) as { records: unknown[] }).records,
    );
    await rendered(element);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fires vcv-select with the KPI when a sphere is clicked", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    const selected: VcvSelectDetail[] = [];
    let crossed = false;
    document.body.addEventListener("vcv-select", (event) => {
      crossed = true;
      selected.push((event as CustomEvent<VcvSelectDetail>).detail);
    });

    // Compact: the bar opens its full card, whose spheres select.
    shadow(element)
      .querySelector(".vcv-bar")
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
    const sphere = shadow(element).querySelector(
      ".vcv-detail .vcv-card .vcv-sphere",
    );
    sphere?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );

    // It bubbles out of the shadow root to the page.
    expect(crossed).toBe(true);
    expect(selected).toEqual([
      {
        node: "BU1 - P2: Product Development",
        group: "Primary",
        subGroup: "",
        metric: "Product Launch Milestones Delivered > RF Plan",
        year: 2026,
        period: "August",
        actual: 10,
        budget: 10,
        hasData: true,
        met: true,
        level: 1,
        label: "100%",
      },
    ]);
  });

  it("fires nothing for a click away from a sphere", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    const listener = vi.fn();
    element.addEventListener("vcv-select", listener);
    shadow(element)
      .querySelector(".vcv-kpi__label")
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
    shadow(element)
      .querySelector(".vcv-card__title")
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
    expect(listener).not.toHaveBeenCalled();
  });

  it("fires vcv-change when the viewer changes a control", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    const changes: unknown[] = [];
    element.addEventListener("vcv-change", (event) =>
      changes.push((event as CustomEvent).detail),
    );
    const period = shadow(element).querySelector<HTMLSelectElement>(
      ".vcv-control--period select",
    );
    if (!period) throw new Error("no period select");
    period.value = "July";
    period.dispatchEvent(new Event("change"));
    expect(changes).toEqual([
      {
        year: 2026,
        period: "July",
        fillColor: "#8fd3f4",
        shortfallColor: "#ff9f40",
      },
    ]);
  });

  it("clears its shadow root when removed from the page, and redraws when put back", async () => {
    const element = mount({ "data-src": "/data/bobos-big-block.json" });
    await rendered(element);
    element.remove();
    expect(shadow(element).querySelector(".vcv-root")).toBeNull();
    document.body.appendChild(element);
    await rendered(element);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("data-card-display", () => {
  const bars = (element: HTMLElement) =>
    shadow(element).querySelectorAll(".vcv-grid .vcv-bar");
  const cards = (element: HTMLElement) =>
    shadow(element).querySelectorAll(".vcv-grid > .vcv-card");

  it("draws compact bars by default", async () => {
    const element = mount({ "data-src": "/kpis.json" });
    await rendered(element);
    expect(bars(element)).toHaveLength(9);
    expect(cards(element)).toHaveLength(0);
  });

  it("draws today's full cards with data-card-display=full", async () => {
    const element = mount({
      "data-src": "/kpis.json",
      "data-card-display": "full",
    });
    await rendered(element);
    expect(cards(element)).toHaveLength(9);
    expect(bars(element)).toHaveLength(0);
  });

  it("follows a later change, in place", async () => {
    const element = mount({ "data-src": "/kpis.json" });
    await rendered(element);
    const root = shadow(element).querySelector(".vcv-root");
    element.setAttribute("data-card-display", "full");
    expect(cards(element)).toHaveLength(9);
    element.removeAttribute("data-card-display");
    expect(bars(element)).toHaveLength(9);
    expect(shadow(element).querySelector(".vcv-root")).toBe(root);
  });

  it("treats anything else as compact", async () => {
    const element = mount({
      "data-src": "/kpis.json",
      "data-card-display": "wide",
    });
    await rendered(element);
    expect(bars(element)).toHaveLength(9);
  });
});
