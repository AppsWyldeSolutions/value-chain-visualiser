import { describe, expect, it, vi } from "vitest";
import { readMapping, SETTINGS_KEY, writeMapping } from "./mapping.js";
import type { Settings } from "./tableau.js";

function fakeSettings(values: Record<string, string> = {}): Settings {
  return {
    get: vi.fn((key: string) => values[key]),
    set: vi.fn((key: string, value: string) => {
      values[key] = value;
    }),
    saveAsync: vi.fn(async () => values),
  };
}

const MAPPING = {
  worksheet: "Scorecard",
  fields: { node: "Process", metric: "KPI Name", actual: "SUM(Actual $)" },
};

describe("readMapping", () => {
  it("reads what writeMapping wrote", () => {
    const settings = fakeSettings();
    writeMapping(settings, MAPPING);
    expect(readMapping(settings)).toEqual(MAPPING);
  });

  it("stores one versioned JSON value under one key", () => {
    const settings = fakeSettings();
    writeMapping(settings, MAPPING);
    expect(settings.set).toHaveBeenCalledOnce();
    expect(JSON.parse(vi.mocked(settings.set).mock.calls[0]![1])).toEqual({
      version: 1,
      ...MAPPING,
    });
    expect(vi.mocked(settings.set).mock.calls[0]![0]).toBe(SETTINGS_KEY);
  });

  it("is undefined when nothing has been configured", () => {
    expect(readMapping(fakeSettings())).toBeUndefined();
    expect(readMapping(undefined)).toBeUndefined();
  });

  it("ignores a value it cannot use, rather than failing", () => {
    for (const value of [
      "not json",
      "null",
      "[]",
      JSON.stringify({ version: 2, ...MAPPING }),
      JSON.stringify({ version: 1, fields: {} }),
      JSON.stringify({ version: 1, worksheet: "", fields: {} }),
      JSON.stringify({ version: 1, worksheet: "KPIs", fields: [] }),
    ]) {
      expect(
        readMapping(fakeSettings({ [SETTINGS_KEY]: value })),
        value,
      ).toBeUndefined();
    }
  });

  it("keeps only the known fields mapped to a column name", () => {
    const value = JSON.stringify({
      version: 1,
      worksheet: "KPIs",
      fields: { node: "Process", colour: "Red", metric: 3, budget: "" },
    });
    expect(readMapping(fakeSettings({ [SETTINGS_KEY]: value }))).toEqual({
      worksheet: "KPIs",
      fields: { node: "Process" },
    });
  });
});
