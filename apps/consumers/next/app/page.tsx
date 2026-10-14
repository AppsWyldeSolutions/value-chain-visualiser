import { readFile } from "node:fs/promises";
import path from "node:path";
import { Chain } from "./chain";

// A server component: reads the KPI data (your database or API in a real app)
// and hands it to the client component. Read at build time, so the page is
// static.
export default async function Page() {
  const file =
    process.env.KPI_FILE ??
    path.resolve(process.cwd(), "../../../fixtures/bobos-big-block.json");
  const data: unknown = JSON.parse(
    await readFile(/*turbopackIgnore: true*/ file, "utf8"),
  );
  return (
    <main>
      <Chain data={data} />
    </main>
  );
}
