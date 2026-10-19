import type { KpiRow } from "@appswyldesolutions/vcv-core";
import {
  DEFAULT_HEADING,
  defaultTheme,
  OCEAN_PRESETS,
} from "@appswyldesolutions/vcv-renderer";
import { describe, expect, it } from "vitest";
import { headerFrom, rowsToShow, themeFrom } from "./format";
import { PRESETS, VisualFormattingSettingsModel } from "./settings";

function settings(
  change: (model: VisualFormattingSettingsModel) => void = () => {},
) {
  const model = new VisualFormattingSettingsModel();
  change(model);
  return model;
}

describe("themeFrom", () => {
  it("offers exactly the renderer's ocean presets", () => {
    expect(PRESETS.map((item) => item.value)).toEqual(
      Object.keys(OCEAN_PRESETS),
    );
  });

  it("leaves every default as the renderer's", () => {
    expect(themeFrom(settings())).toEqual({
      fillColor: defaultTheme.fillColor,
      shortfallColor: defaultTheme.shortfallColor,
      ocean: { ...OCEAN_PRESETS.ocean, opacity: "1" },
      card: {
        primarySphereSize: defaultTheme.card.primarySphereSize,
        satelliteSphereSize: defaultTheme.card.satelliteSphereSize,
        satelliteSlot: defaultTheme.card.satelliteSlot,
        satelliteMinSlot: defaultTheme.card.satelliteMinSlot,
      },
      score: {
        panelSphereSize: defaultTheme.score.panelSphereSize,
        panelSlot: defaultTheme.score.panelSlot,
        panelMinSlot: defaultTheme.score.panelMinSlot,
      },
    });
  });

  it("takes the fill and shortfall colours", () => {
    const theme = themeFrom(
      settings((model) => {
        model.colours.fillColor.value = { value: "#2f9e44" };
        model.colours.shortfallColor.value = { value: "#e03131" };
      }),
    );
    expect(theme.fillColor).toBe("#2f9e44");
    expect(theme.shortfallColor).toBe("#e03131");
  });

  it("takes the ocean preset and its opacity", () => {
    const theme = themeFrom(
      settings((model) => {
        model.background.preset.value = model.background.preset.items.find(
          (item) => item.value === "deep",
        )!;
        model.background.opacity.value = 40;
      }),
    );
    expect(theme.ocean).toEqual({ ...OCEAN_PRESETS.deep, opacity: "0.4" });
  });

  it("scales every sphere, and the slots they sit in, together", () => {
    const theme = themeFrom(
      settings((model) => {
        model.display.sphereSize.value = 150;
      }),
    );
    expect(theme.card).toEqual({
      primarySphereSize: "198px",
      satelliteSphereSize: "108px",
      satelliteSlot: "135px",
      satelliteMinSlot: "105px",
    });
    expect(theme.score).toEqual({
      panelSphereSize: "126px",
      panelSlot: "225px",
      panelMinSlot: "144px",
    });
  });

  it("keeps opacity and sphere size within their slider's range", () => {
    const theme = themeFrom(
      settings((model) => {
        model.background.opacity.value = 250;
        model.display.sphereSize.value = 10;
      }),
    );
    expect(theme.ocean?.opacity).toBe("1");
    expect(theme.card?.primarySphereSize).toBe("66px");
  });
});

describe("headerFrom", () => {
  it("leaves the renderer's heading as it is by default", () => {
    expect(headerFrom(settings())).toEqual({
      eyebrow: DEFAULT_HEADING.eyebrow,
      title: DEFAULT_HEADING.title,
      show: true,
      showSubtitle: true,
    });
  });

  it("takes the Header card's text and switches", () => {
    const header = headerFrom(
      settings((model) => {
        model.header.eyebrow.value = "Wylde";
        model.header.title.value = "Operations chain";
        model.header.showHeader.value = false;
        model.header.showSubtitle.value = false;
      }),
    );
    expect(header).toEqual({
      eyebrow: "Wylde",
      title: "Operations chain",
      show: false,
      showSubtitle: false,
    });
  });
});

describe("rowsToShow", () => {
  const row = (group: KpiRow["group"]) => ({ group }) as KpiRow;
  const rows = [row("Primary"), row("Transfer Points"), row("Satellite")];

  it("keeps Transfer Points by default", () => {
    expect(rowsToShow(rows, settings())).toEqual(rows);
  });

  it("drops them when Transfer Points are hidden", () => {
    const hidden = settings((model) => {
      model.display.showTransferPoints.value = false;
    });
    expect(rowsToShow(rows, hidden).map((r) => r.group)).toEqual([
      "Primary",
      "Satellite",
    ]);
  });
});
