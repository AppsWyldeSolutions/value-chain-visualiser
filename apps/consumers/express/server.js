// The Express recipe from docs/frameworks.md: the web component's browser
// build served as a static file, and the KPI data from a JSON endpoint.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// The folder holding dist/vcv.iife.js, found through the package's
// "./browser" export rather than a hard-coded node_modules path.
const vcvDist = path.dirname(
  require.resolve("@appswyldesolutions/vcv-web-component/browser"),
);

// Stands in for your database or API: any of the shapes the element accepts.
const kpiFile =
  process.env.KPI_FILE ??
  path.resolve(here, "../../../fixtures/bobos-big-block.json");

const app = express();

app.use("/vcv", express.static(vcvDist, { maxAge: "1h" }));

app.get("/api/kpis", async (_request, response, next) => {
  try {
    response.type("json").send(await readFile(kpiFile, "utf8"));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(here, "public")));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`vcv consumer (express) on http://localhost:${port}`);
});
