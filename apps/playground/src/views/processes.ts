import {
  buildModel,
  fromLongRows,
  fromWideRecords,
  type KpiRow,
  type NodeModel,
} from "@AppsWyldeSolutions/vcv-core";
import { isScoreCard } from "@AppsWyldeSolutions/vcv-renderer";
import longFixture from "@fixtures/bobos-big-block.json";
import wideFixture from "@fixtures/main-dc-prototype.json";

export const SELECTION = { year: 2026, period: "August" };

// The same 85 KPIs in the two shapes core ingests, named as ?fixture=<name>.
const FIXTURES: Record<string, () => KpiRow[]> = {
  "bobos-big-block": () =>
    fromLongRows((longFixture as { records: unknown[] }).records),
  "main-dc-prototype": () => fromWideRecords(wideFixture),
};
const DEFAULT_FIXTURE = "bobos-big-block";

/** Every node of a fixture for the selected period, in chain order. */
export function loadNodes(fixture = DEFAULT_FIXTURE): NodeModel[] {
  const rows = (FIXTURES[fixture] ?? FIXTURES[DEFAULT_FIXTURE])?.() ?? [];
  return buildModel(rows, SELECTION).nodes;
}

/** The 8 processes of fixtures/bobos-big-block.json, without the Score Card. */
export function loadProcesses(): NodeModel[] {
  return loadNodes().filter((node) => !isScoreCard(node));
}
