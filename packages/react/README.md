# @appswyldesolutions/vcv-react

React wrapper for `<value-chain-visualiser>`, the glass-and-spheres KPI
visual for business-process value chains. A client component, so it works in
the Next.js App Router.

```sh
npm install @appswyldesolutions/vcv-react
```

It is public on npm: no token, `.npmrc` or registry setup. `react` 18 or
later is a peer dependency; the web component comes with the wrapper.

```tsx
import {
  ValueChainVisualiser,
  type KpiRow,
} from "@appswyldesolutions/vcv-react";

export function Chain({ rows }: { rows: KpiRow[] }) {
  return (
    <ValueChainVisualiser
      rows={rows}
      period="July"
      theme={{ fillColor: "#2f9e44", shortfallColor: "#e03131" }}
      onSelect={(kpi) => console.log(kpi.metric)}
    />
  );
}
```

All props, and the Next.js recipes:
[docs/frameworks.md](https://github.com/AppsWyldeSolutions/value-chain-visualiser/blob/main/docs/frameworks.md).

MIT licensed.
