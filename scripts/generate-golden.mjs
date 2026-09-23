// Regenerates fixtures/golden/*.json by evaluating each fixture with the
// prototype's own logic (transcribed verbatim from docs/prototype/Main.dc.html,
// not the packages/core port), so the port has an independent ground truth to
// be tested against. Run with: node scripts/generate-golden.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const fixturesDir = path.join(rootDir, "fixtures");
const goldenDir = path.join(fixturesDir, "golden");

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// --- verbatim from docs/prototype/Main.dc.html ---
function num(v) {
  if (v === undefined || v === null) return NaN;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "") return NaN;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}
function trimNum(s) {
  return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}
function fmt(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return trimNum((n / 1e6).toFixed(2)) + "M";
  if (a >= 100) return Math.round(n).toLocaleString("en-US");
  if (a >= 1) return trimNum(n.toFixed(2));
  return trimNum(n.toFixed(3));
}
function unitParts(u) {
  if (u === "$") return ["$", "", true];
  if (/^\$[kKmMbB]$/.test(u)) return ["$", u.slice(1), true];
  if (u === "%") return ["", "%", true];
  if (u === "x") return ["", "x", true];
  if (u === "000s") return ["", " (000s)", false];
  if (u) return ["", " " + u, false];
  return ["", "", false];
}
function unitFor(m, rawUnit, a, b) {
  let u = (rawUnit || "").trim();
  if (/^\d+%$/.test(u)) u = "%";
  const tag = String(m || "").match(/\((\$[kKmMbB]?|000s)\)/);
  if (tag && (u === "" || u === "%" || u === "$")) u = tag[1];
  if (u === "%" && Math.max(Math.abs(a), Math.abs(b)) > 1000) u = "";
  return u;
}
function withPre(n, p) {
  return (n < 0 ? "-" : "") + p + fmt(Math.abs(n));
}
function one(n, u) {
  const p = unitParts(u);
  return withPre(n, p[0]) + p[1];
}
function two(a, b, u) {
  const p = unitParts(u);
  return (
    withPre(a, p[0]) + (p[2] ? p[1] : "") + " / " + withPre(b, p[0]) + p[1]
  );
}
// --- end verbatim ---

function evaluateRow(operator, rawUnit, metric, a, b) {
  const has = !isNaN(a) && !isNaN(b);
  const lessThan = operator === "LessThan";
  let met = false;
  let level = 0;
  if (has) {
    met = lessThan ? a <= b : a >= b;
    level = b > 0 ? Math.max(0, Math.min(1, a / b)) : met || a > 0 ? 1 : 0;
  }
  const u = has ? unitFor(metric, rawUnit, a, b) : "";
  let label = "No data";
  if (has)
    label =
      b > 0
        ? Math.round((a / b) * 100) + "%"
        : met
          ? "On target"
          : "Off target";
  return {
    hasData: has,
    met,
    level,
    label,
    actualStr: has ? one(a, u) : "",
    budgetStr: has ? one(b, u) : "",
    pair: has ? two(a, b, u) : "",
  };
}

function firstSeenOrder(names) {
  const order = new Map();
  names.forEach((n) => {
    if (!order.has(n)) order.set(n, order.size);
  });
  return order;
}

function generateFromWide(records) {
  const order = firstSeenOrder(records.map((r) => r.l));
  const out = [];
  records.forEach((r) => {
    for (let i = 0; i < 12; i++) {
      const a = num(r.a[i]);
      const b = num(r.b[i]);
      out.push({
        node: r.l,
        nodeOrder: order.get(r.l),
        group: r.g,
        subGroup: r.s,
        metric: r.m,
        operator: r.o,
        valueType: r.t,
        symbol: r.u,
        year: Number(r.y),
        period: MONTH_LABELS[i],
        actual: isNaN(a) ? null : a,
        budget: isNaN(b) ? null : b,
        ...evaluateRow(r.o, r.u, r.m, a, b),
      });
    }
  });
  return out;
}

function generateFromLong(records) {
  const order = firstSeenOrder(records.map((r) => r.link));
  const out = [];
  records.forEach((r) => {
    for (let i = 0; i < 12; i++) {
      const month = MONTHS[i];
      const a = num(r[month]);
      const b = num(r[month + "Budget"]);
      out.push({
        node: r.link,
        nodeOrder: order.get(r.link),
        group: r.group,
        subGroup: r.subGroup,
        metric: r.metric,
        operator: r.kpiOperator,
        valueType: r.metricValueType,
        symbol: r.kpiSymbol,
        year: Number(r.year),
        period: MONTH_LABELS[i],
        actual: isNaN(a) ? null : a,
        budget: isNaN(b) ? null : b,
        ...evaluateRow(r.kpiOperator, r.kpiSymbol, r.metric, a, b),
      });
    }
  });
  return out;
}

async function main() {
  await mkdir(goldenDir, { recursive: true });

  const wide = JSON.parse(
    await readFile(path.join(fixturesDir, "main-dc-prototype.json"), "utf8"),
  );
  const wideGolden = generateFromWide(wide);
  await writeFile(
    path.join(goldenDir, "main-dc-prototype.json"),
    JSON.stringify(wideGolden, null, 2) + "\n",
  );

  const long = JSON.parse(
    await readFile(path.join(fixturesDir, "bobos-big-block.json"), "utf8"),
  );
  const longGolden = generateFromLong(long.records);
  await writeFile(
    path.join(goldenDir, "bobos-big-block.json"),
    JSON.stringify(longGolden, null, 2) + "\n",
  );

  console.log(
    `wrote ${wideGolden.length} rows to fixtures/golden/main-dc-prototype.json`,
  );
  console.log(
    `wrote ${longGolden.length} rows to fixtures/golden/bobos-big-block.json`,
  );
}

main();
