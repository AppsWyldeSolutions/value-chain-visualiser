// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createShell } from "./shell.js";
import { defaultTheme } from "./theme.js";

function mount(): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe("createShell", () => {
  it("builds the ocean, header and empty grid inside the container", () => {
    const container = mount();
    const shell = createShell(container);

    expect(shell.root.parentElement).toBe(container);
    expect(shell.root.classList.contains("vcv-root")).toBe(true);

    const ocean = shell.root.querySelector(".vcv-ocean");
    expect(ocean?.getAttribute("aria-hidden")).toBe("true");
    expect(ocean?.querySelectorAll(".vcv-ocean__ray")).toHaveLength(
      defaultTheme.ocean.rays.length,
    );
    expect(ocean?.querySelectorAll(".vcv-ocean__wave")).toHaveLength(
      defaultTheme.ocean.waveOpacities.length,
    );
    expect(ocean?.querySelectorAll(".vcv-ocean__bubble")).toHaveLength(
      defaultTheme.ocean.bubbles.length,
    );

    expect(shell.root.querySelector(".vcv-header__eyebrow")?.textContent).toBe(
      "Value chain",
    );
    expect(shell.root.querySelector("h1")?.textContent).toBe(
      "Business Processes & Scorecard",
    );
    expect(shell.controls.childElementCount).toBe(0);
    expect(shell.grid.childElementCount).toBe(0);
  });

  it("writes header text as text, never as markup", () => {
    const shell = createShell(mount(), {
      title: "<img src=x onerror=alert(1)>",
      subtitle: "<b>August</b>",
    });
    expect(shell.root.querySelector("img")).toBeNull();
    expect(shell.root.querySelector("b")).toBeNull();
    expect(shell.root.querySelector("h1")?.textContent).toBe(
      "<img src=x onerror=alert(1)>",
    );

    shell.setSubtitle("<i>July</i>");
    expect(shell.root.querySelector("i")).toBeNull();
    expect(shell.root.querySelector(".vcv-header__subtitle")?.textContent).toBe(
      "<i>July</i>",
    );
  });

  it("applies the theme as custom properties on the root", () => {
    const shell = createShell(mount(), { theme: { fillColor: "#112233" } });
    const style = shell.root.style;
    expect(style.getPropertyValue("--vcv-fill-color")).toBe("#112233");
    expect(style.getPropertyValue("--vcv-shortfall-color")).toBe("#ff9f40");
    expect(style.getPropertyValue("--vcv-ocean-base")).toBe("#073a63");

    shell.setTheme({ shortfallColor: "#445566" });
    expect(style.getPropertyValue("--vcv-fill-color")).toBe("#112233");
    expect(style.getPropertyValue("--vcv-shortfall-color")).toBe("#445566");
  });

  it("positions rays and bubbles from the theme", () => {
    const shell = createShell(mount(), {
      theme: {
        ocean: {
          rays: [
            {
              left: "10%",
              width: "50px",
              height: "40%",
              opacity: 0.2,
              blur: "4px",
            },
          ],
          bubbles: [{ left: "5%", top: "60%", size: "9px", delay: "-2s" }],
        },
      },
    });
    const rays = shell.root.querySelectorAll<HTMLElement>(".vcv-ocean__ray");
    expect(rays).toHaveLength(1);
    expect(rays[0]?.style.getPropertyValue("--vcv-ray-left")).toBe("10%");
    expect(rays[0]?.style.getPropertyValue("--vcv-ray-opacity")).toBe("0.2");

    const bubbles =
      shell.root.querySelectorAll<HTMLElement>(".vcv-ocean__bubble");
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0]?.style.getPropertyValue("--vcv-bubble-top")).toBe("60%");
    expect(bubbles[0]?.style.getPropertyValue("--vcv-bubble-delay")).toBe(
      "-2s",
    );
  });

  it("installs the stylesheet and the fonts once per document", () => {
    createShell(mount());
    createShell(mount());
    expect(
      document.head.querySelectorAll("style[data-vcv-styles]"),
    ).toHaveLength(1);
    expect(
      document.head.querySelectorAll("style[data-vcv-fonts]"),
    ).toHaveLength(1);
  });

  it("puts styles in the shadow root and fonts in the document", () => {
    const host = mount();
    const shadow = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    shadow.appendChild(container);

    createShell(container);

    expect(shadow.querySelectorAll("style[data-vcv-styles]")).toHaveLength(1);
    expect(
      document.head.querySelectorAll("style[data-vcv-styles]"),
    ).toHaveLength(0);
    expect(
      document.head.querySelectorAll("style[data-vcv-fonts]"),
    ).toHaveLength(1);
  });

  it("removes the root on destroy", () => {
    const container = mount();
    const shell = createShell(container);
    shell.destroy();
    expect(container.childElementCount).toBe(0);
  });
});
