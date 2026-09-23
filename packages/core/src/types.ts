export type Operator = "Equal" | "LessThan";

export interface KpiRow {
  node: string;
  nodeOrder: number;
  group: "Primary" | "Satellite" | "Transfer Points";
  subGroup: string;
  metric: string;
  operator: Operator;
  valueType: string;
  symbol: string;
  year: number;
  period: string;
  actual: number | null;
  budget: number | null;
}

export interface Theme {
  fillColor: string;
  shortfallColor: string;
  /* fonts, radii, glass opacity */
}

export interface Evaluation {
  met: boolean;
  level: number;
  label: string;
  hasData: boolean;
}

export interface FormattedValues {
  actual: string;
  budget: string;
  pair: string;
}

export interface EvaluatedKpi extends Evaluation, FormattedValues {
  row: KpiRow;
}

export interface NodeModel {
  node: string;
  nodeOrder: number;
  primary: EvaluatedKpi[];
  satellite: EvaluatedKpi[];
  transferPoints: EvaluatedKpi[];
}

export interface ValueChainVisualiserModel {
  year: number;
  period: string;
  nodes: NodeModel[];
}
