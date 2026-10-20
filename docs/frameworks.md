# Using the visual in React, Vue, Angular and Express

The visual is one custom element, `<value-chain-visualiser>`, from
`@appswyldesolutions/vcv-web-component` (see the "Web component" section of
`docs/specs/renderer.md` for its attributes, events and package entries).

- **React** has a typed wrapper, `@appswyldesolutions/vcv-react`.
- **Vue and Angular** use the tag directly, after a line of setup each, below.
- **Express** (or any server with no front-end framework) serves the
  single-file browser build and a JSON endpoint; see the last section.

All four `@appswyldesolutions/vcv-*` packages are public on npm: a plain
`npm install` works, with no auth token, `.npmrc` or registry setup.

By default the visual is **compact**: one small bar per link, in a single
row that scales with its width; clicking a bar opens its full card. For the
grid of full cards, set `data-card-display="full"` on the element (or
`cardDisplay="full"` on the React wrapper). Viewers can also switch with
the **View** control in the visual's header; `vcv-change` (React's
`onChange`) reports their choice as `cardDisplay`.

Two rules hold in every framework:

1. **Register the element before the framework sets `rows`.** Import
   `@appswyldesolutions/vcv-web-component/define` before the app mounts. If
   `rows` is set on the tag before it is registered, it lands as a plain
   property on the element, hiding the element's own `rows` setter, and
   nothing draws. The React wrapper takes care of this itself.
2. **Keep the element out of server rendering.** Loading any entry of the web
   component package needs `HTMLElement`, so do not import it (not even
   `rowsFromJson`) in code that runs on the server. The React wrapper only
   loads it in the browser.

## React

```sh
npm install @appswyldesolutions/vcv-react
```

`react` (18 or later) is a peer dependency. The wrapper depends on the web
component, so that comes with it.

```tsx
import {
  ValueChainVisualiser,
  type KpiRow,
  type VcvSelectDetail,
} from "@appswyldesolutions/vcv-react";

export function Chain({ rows }: { rows: KpiRow[] }) {
  return (
    <ValueChainVisualiser
      rows={rows}
      year={2026}
      period="July"
      theme={{ fillColor: "#2f9e44", shortfallColor: "#e03131" }}
      onSelect={(kpi: VcvSelectDetail) => console.log(kpi.metric, kpi.label)}
      style={{ minHeight: 600 }}
    />
  );
}
```

| Prop          | Type                                | Becomes                                              |
| ------------- | ----------------------------------- | ---------------------------------------------------- |
| `rows`        | `KpiRow[]`                          | The element's `rows` property                        |
| `year`        | `number`                            | `data-year`                                          |
| `period`      | `string`                            | `data-period`                                        |
| `theme`       | `{ fillColor?, shortfallColor? }`   | `data-fill-color`, `data-shortfall-color`            |
| `onSelect`    | `(detail: VcvSelectDetail) => void` | A `vcv-select` listener                              |
| `onChange`    | `(detail: VcvChangeDetail) => void` | A `vcv-change` listener                              |
| `onError`     | `(error: Error) => void`            | A `vcv-error` listener; also called if loading fails |
| `className`   | `string`                            | `class`                                              |
| `style`       | `CSSProperties`                     | `style`                                              |
| `cardDisplay` | `"compact" \| "full"`               | `data-card-display` (compact when left out)          |

- Changing a prop updates the same element; it is never remounted. Leaving a
  prop out removes its attribute, so the element falls back to its default.
- A new `onSelect` (or `onChange`, `onError`) each render is fine: the
  wrapper calls the latest one without subscribing again.
- `KpiRow`, `VcvSelectDetail` and `VcvChangeDetail` are re-exported from the
  web component, so one install covers the types too.

### Next.js App Router

The wrapper is a client component (its build starts with `"use client"`), so
a server component can render it and pass it data. On the server it renders
the bare `<value-chain-visualiser>` tag; the browser registers the element
and draws the visual.

```tsx
// app/chain/page.tsx: a server component
import {
  ValueChainVisualiser,
  type KpiRow,
} from "@appswyldesolutions/vcv-react";
import { getKpiRows } from "@/lib/kpis"; // your data, as KpiRow[]

export default async function Page() {
  const rows: KpiRow[] = await getKpiRows();
  return (
    <ValueChainVisualiser
      rows={rows}
      period="July"
      theme={{ fillColor: "#2f9e44", shortfallColor: "#e03131" }}
    />
  );
}
```

Functions cannot pass from a server component to a client one, so handle
`onSelect` in a component of your own marked `"use client"`:

```tsx
// app/chain/chain.tsx
"use client";
import { useRouter } from "next/navigation";
import {
  ValueChainVisualiser,
  type KpiRow,
} from "@appswyldesolutions/vcv-react";

export function Chain({ rows }: { rows: KpiRow[] }) {
  const router = useRouter();
  return (
    <ValueChainVisualiser
      rows={rows}
      onSelect={(kpi) => router.push(`/kpis/${encodeURIComponent(kpi.metric)}`)}
    />
  );
}
```

#### Data in the API's shape

`rows` takes `KpiRow[]`. If your data is in the shape the element fetches
through `data-src` (`{ "records": [...] }` of long rows, or wide records),
convert it with `rowsFromJson`. That lives in the web component package, which
cannot load on the server (rule 2), so pass the raw JSON to your client
component and convert it in an effect:

```tsx
// app/chain/chain.tsx
"use client";
import { useEffect, useState } from "react";
import {
  ValueChainVisualiser,
  type KpiRow,
} from "@appswyldesolutions/vcv-react";

export function Chain({ data }: { data: unknown }) {
  const [rows, setRows] = useState<KpiRow[]>([]);
  useEffect(() => {
    let mounted = true;
    void import("@appswyldesolutions/vcv-web-component").then(
      ({ rowsFromJson }) => {
        if (mounted) setRows(rowsFromJson(data));
      },
    );
    return () => {
      mounted = false;
    };
  }, [data]);
  return <ValueChainVisualiser rows={rows} />;
}
```

Install `@appswyldesolutions/vcv-web-component` alongside the wrapper when
you import it yourself like this. `apps/consumers/next` is a working example,
and the consumer smoke tests run it.

## Vue 3

Tell Vue's template compiler that the tag is a custom element, so it does not
try to resolve it as a Vue component:

```ts
// vite.config.ts
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "value-chain-visualiser",
        },
      },
    }),
  ],
});
```

Register the element before mounting (rule 1):

```ts
// main.ts
import "@appswyldesolutions/vcv-web-component/define";
import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
```

Bind `rows` with `.prop` so Vue sets the property, not an attribute, and the
others as `data-*` attributes:

```vue
<script setup lang="ts">
import type {
  KpiRow,
  VcvSelectDetail,
} from "@appswyldesolutions/vcv-web-component";

defineProps<{ rows: KpiRow[] }>();
function onSelect(event: Event) {
  const kpi = (event as CustomEvent<VcvSelectDetail>).detail;
  console.log(kpi.metric, kpi.label);
}
</script>

<template>
  <value-chain-visualiser
    :rows.prop="rows"
    data-period="July"
    data-fill-color="#2f9e44"
    @vcv-select="onSelect"
  />
</template>
```

With Nuxt, set `vue.compilerOptions.isCustomElement` in `nuxt.config.ts`
instead, and register the element in a client-only plugin
(`plugins/vcv.client.ts`).

## Angular

Allow unknown elements in the component that uses the tag with
`CUSTOM_ELEMENTS_SCHEMA`, and register the element (rule 1):

```ts
// chain.component.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from "@angular/core";
import "@appswyldesolutions/vcv-web-component/define";
import type {
  KpiRow,
  VcvSelectDetail,
} from "@appswyldesolutions/vcv-web-component";

@Component({
  selector: "app-chain",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <value-chain-visualiser
      [rows]="rows()"
      [attr.data-period]="period()"
      data-fill-color="#2f9e44"
      (vcv-select)="onSelect($event)"
    ></value-chain-visualiser>
  `,
})
export class ChainComponent {
  rows = input.required<KpiRow[]>();
  period = input<string>("July");

  onSelect(event: Event) {
    const kpi = (event as CustomEvent<VcvSelectDetail>).detail;
    console.log(kpi.metric, kpi.label);
  }
}
```

- `[rows]` sets the property; `[attr.data-period]` sets the attribute, and
  removes it when the value is `null`.
- An NgModule app puts `schemas: [CUSTOM_ELEMENTS_SCHEMA]` on the module that
  declares the component instead.
- With Angular SSR, the top-level import breaks the server build (rule 2).
  Load it in the browser only, for example
  `afterNextRender(() => import("@appswyldesolutions/vcv-web-component/define"))`,
  and bind `rows` only once that promise has resolved.

## Express

No bundler and no front-end framework: serve the web component's single-file
browser build as a static file, serve the KPI data from a JSON endpoint, and
point `data-src` at it.

```sh
npm install express @appswyldesolutions/vcv-web-component
```

```js
// server.js
import { createRequire } from "node:module";
import path from "node:path";
import express from "express";

const require = createRequire(import.meta.url);
// The folder holding vcv.iife.js, found through the package's "./browser"
// export, so it does not depend on where node_modules is.
const vcvDist = path.dirname(
  require.resolve("@appswyldesolutions/vcv-web-component/browser"),
);

const app = express();
app.use("/vcv", express.static(vcvDist, { maxAge: "1h" }));

app.get("/api/kpis", async (request, response) => {
  response.json({ records: await loadKpiRecords() }); // your data
});

app.use(express.static("public"));
app.listen(3000);
```

```html
<!-- public/index.html -->
<script src="/vcv/vcv.iife.js" defer></script>
<value-chain-visualiser data-src="/api/kpis"></value-chain-visualiser>
```

- **What the endpoint returns.** Any shape `data-src` accepts:
  `{ "records": [...] }` or a bare array of long rows (one row per KPI and
  year, with `link`, `group`, `subGroup`, `metric`, `kpiOperator`,
  `metricValueType`, `kpiSymbol`, `year`, `january`…`december` and
  `januaryBudget`…`decemberBudget`; see `fixtures/bobos-big-block.json`), or
  the prototype's wide records (`fixtures/main-dc-prototype.json`).
- **Same origin.** The element fetches `data-src` from the browser. Serve the
  endpoint from the page's origin, as here, or send CORS headers from it.
- **Errors.** A failed fetch or unreadable data fires `vcv-error` on the
  element; listen for it to show your own message.
- **The script.** `vcv.iife.js` registers the element and puts the package's
  exports on `window.ValueChainVisualiser`. It makes no network requests of
  its own beyond `data-src`.

`apps/consumers/express` is a working example, and the consumer smoke tests
run it.
