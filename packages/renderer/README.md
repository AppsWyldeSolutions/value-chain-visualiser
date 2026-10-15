# @appswyldesolutions/vcv-renderer

Draws the Value Chain Visualiser with vanilla DOM, SVG and CSS: the glass
cards, spheres, connectors and header controls, from KPI rows and a theme. No
framework.

```sh
npm install @appswyldesolutions/vcv-renderer
```

It is public on npm: no token, `.npmrc` or registry setup. It installs
`@appswyldesolutions/vcv-core` with it.

```ts
import { createVisual } from "@appswyldesolutions/vcv-renderer";

const visual = createVisual(document.querySelector("#chain")!, {
  rows,
  theme: { fillColor: "#2f9e44", shortfallColor: "#e03131" },
  onSelect: (kpi) => console.log(kpi.metric),
});
```

Most apps want
[@appswyldesolutions/vcv-web-component](https://www.npmjs.com/package/@appswyldesolutions/vcv-web-component)
(one element, data from a URL) or
[@appswyldesolutions/vcv-react](https://www.npmjs.com/package/@appswyldesolutions/vcv-react)
instead. Specs: [docs/specs/renderer.md](https://github.com/AppsWyldeSolutions/value-chain-visualiser/blob/main/docs/specs/renderer.md).

MIT licensed. The embedded DM Sans and Bricolage Grotesque fonts are under
the SIL Open Font License; see `licenses/`.
