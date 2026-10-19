import { readFileSync } from "node:fs";
import path from "node:path";
import type { KpiRow } from "@appswyldesolutions/vcv-core";
import { describe, expect, it } from "vitest";
import { ROLES } from "./rows";
import { PRESETS, VisualFormattingSettingsModel } from "./settings";
import { TOOLTIPS_ROLE } from "./tooltips";

type Capabilities = {
  dataRoles: { name: string; displayName: string; kind: string }[];
  dataViewMappings: {
    table: {
      rows: {
        select: { for: { in: string } }[];
        dataReductionAlgorithm?: { window?: { count?: number } };
      };
    };
  }[];
  objects?: Record<
    string,
    { properties: Record<string, { type: Record<string, unknown> }> }
  >;
  tooltips?: unknown;
  supportsLandingPage?: boolean;
  supportsEmptyDataView?: boolean;
  privileges?: unknown[];
};

const capabilities = JSON.parse(
  readFileSync(path.resolve(__dirname, "../capabilities.json"), "utf8"),
) as Capabilities;

// Every KpiRow field, so the check below fails if core adds one.
const FIELDS: Record<keyof KpiRow, true> = {
  node: true,
  nodeOrder: true,
  group: true,
  subGroup: true,
  metric: true,
  operator: true,
  valueType: true,
  symbol: true,
  year: true,
  period: true,
  actual: true,
  budget: true,
};

describe("capabilities.json", () => {
  it("asks for no privileges (web access blocks certification)", () => {
    expect(capabilities.privileges).toEqual([]);
  });

  it("has a data role for every KpiRow field, figures as measures", () => {
    const roles = capabilities.dataRoles
      .map((role) => role.name)
      .filter((name) => name !== TOOLTIPS_ROLE);
    expect([...roles].sort()).toEqual(Object.keys(FIELDS).sort());
    expect([...ROLES].sort()).toEqual([...roles].sort());
    for (const role of capabilities.dataRoles) {
      expect(role.kind, role.name).toBe(
        ["actual", "budget", TOOLTIPS_ROLE].includes(role.name)
          ? "Measure"
          : "Grouping",
      );
    }
  });

  it("is updated with no data, so it can ask for the missing fields", () => {
    expect(capabilities.supportsLandingPage).toBe(true);
    expect(capabilities.supportsEmptyDataView).toBe(true);
  });

  it("takes extra tooltip fields, and report page tooltips", () => {
    expect(
      capabilities.dataRoles.find((role) => role.name === TOOLTIPS_ROLE),
    ).toMatchObject({ displayName: "Tooltips", kind: "Measure" });
    expect(capabilities.tooltips).toEqual({
      supportedTypes: { default: true, canvas: true },
      roles: [TOOLTIPS_ROLE],
    });
  });

  it("maps every role into one table, in the roles' order", () => {
    const [mapping, ...rest] = capabilities.dataViewMappings;
    expect(rest).toEqual([]);
    expect(mapping!.table.rows.select.map((s) => s.for.in)).toEqual(
      capabilities.dataRoles.map((role) => role.name),
    );
  });

  it("takes up to 30,000 rows, not Power BI's default 1,000", () => {
    const count =
      capabilities.dataViewMappings[0]!.table.rows.dataReductionAlgorithm
        ?.window?.count;
    expect(count).toBeGreaterThanOrEqual(30_000);
  });

  it("declares every format pane setting, with a type that fits its control", () => {
    // What each control stores; Power BI drops values it has no type for.
    const typeOf: Record<string, string> = {
      ColorPicker: "fill",
      Dropdown: "enumeration",
      ToggleSwitch: "bool",
      Slider: "numeric",
    };
    const model = new VisualFormattingSettingsModel();
    const declared = capabilities.objects ?? {};
    expect(Object.keys(declared).sort()).toEqual(
      model.cards.map((card) => card.name).sort(),
    );
    for (const card of model.cards) {
      const properties = declared[card.name]!.properties;
      const slices = (card as { slices?: { name: string; type?: string }[] })
        .slices!;
      expect(Object.keys(properties).sort(), card.name).toEqual(
        slices.map((slice) => slice.name).sort(),
      );
      for (const slice of slices) {
        expect(
          Object.keys(properties[slice.name]!.type),
          `${card.name}.${slice.name}`,
        ).toEqual([typeOf[slice.type!]]);
      }
    }
  });

  it("lists the ocean presets the Background card offers", () => {
    const preset = capabilities.objects!.background!.properties.preset!;
    expect(preset.type.enumeration).toEqual(PRESETS);
  });
});
