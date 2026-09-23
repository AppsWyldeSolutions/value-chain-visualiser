// Ported verbatim from docs/prototype/Main.dc.html. Keep in lock-step with
// scripts/generate-golden.mjs's transcription of the same logic.

function trimNum(s: string): string {
  return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return trimNum((n / 1e6).toFixed(2)) + "M";
  if (a >= 100) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return trimNum(n.toFixed(2));
  return trimNum(n.toFixed(3));
}

type UnitParts = [prefix: string, suffix: string, suffixOnBothValues: boolean];

function unitParts(u: string): UnitParts {
  if (u === "$") return ["$", "", true];
  if (/^\$[kKmMbB]$/.test(u)) return ["$", u.slice(1), true];
  if (u === "%") return ["", "%", true];
  if (u === "x") return ["", "x", true];
  if (u === "000s") return ["", " (000s)", false];
  if (u) return ["", " " + u, false];
  return ["", "", false];
}

// A unit written in the metric name, e.g. "($M)", "($k)", "(000s)", wins over
// a mismatched symbol. A symbol of "%" is suppressed on very large values.
export function unitFor(
  metric: string,
  rawSymbol: string,
  a: number,
  b: number,
): string {
  let u = (rawSymbol || "").trim();
  if (/^\d+%$/.test(u)) u = "%";
  const tag = metric.match(/\((\$[kKmMbB]?|000s)\)/);
  if (tag && (u === "" || u === "%" || u === "$")) u = tag[1] as string;
  if (u === "%" && Math.max(Math.abs(a), Math.abs(b)) > 1000) u = "";
  return u;
}

function withPre(n: number, p: string): string {
  return (n < 0 ? "-" : "") + p + fmt(Math.abs(n));
}

export function one(n: number, u: string): string {
  const [prefix, suffix] = unitParts(u);
  return withPre(n, prefix) + suffix;
}

export function two(a: number, b: number, u: string): string {
  const [prefix, suffix, suffixOnBoth] = unitParts(u);
  return (
    withPre(a, prefix) +
    (suffixOnBoth ? suffix : "") +
    " / " +
    withPre(b, prefix) +
    suffix
  );
}

export function num(v: unknown): number {
  if (v === undefined || v === null) return NaN;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "") return NaN;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}
