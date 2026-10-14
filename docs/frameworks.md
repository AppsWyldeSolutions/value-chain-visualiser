# Using the visual in React, Vue and Angular

The visual is one custom element, `<value-chain-visualiser>`, from
`@appswyldesolutions/vcv-web-component` (see the "Web component" section of
`docs/specs/renderer.md` for its attributes, events and package entries).

- **React** has a typed wrapper, `@appswyldesolutions/vcv-react`.
- **Vue and Angular** use the tag directly, after a line of setup each, below.

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

| Prop        | Type                                | Becomes                                              |
| ----------- | ----------------------------------- | ---------------------------------------------------- |
| `rows`      | `KpiRow[]`                          | The element's `rows` property                        |
| `year`      | `number`                            | `data-year`                                          |
| `period`    | `string`                            | `data-period`                                        |
| `theme`     | `{ fillColor?, shortfallColor? }`   | `data-fill-color`, `data-shortfall-color`            |
| `onSelect`  | `(detail: VcvSelectDetail) => void` | A `vcv-select` listener                              |
| `onChange`  | `(detail: VcvChangeDetail) => void` | A `vcv-change` listener                              |
| `onError`   | `(error: Error) => void`            | A `vcv-error` listener; also called if loading fails |
| `className` | `string`                            | `class`                                              |
| `style`     | `CSSProperties`                     | `style`                                              |

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
