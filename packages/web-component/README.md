# @appswyldesolutions/vcv-web-component

`<value-chain-visualiser>`: a glass-and-spheres KPI visual for
business-process value chains, as a web component. Core and the renderer are
bundled in, so this is the only package you need.

```sh
npm install @appswyldesolutions/vcv-web-component
```

It is public on npm: no token, `.npmrc` or registry setup.

```js
import "@appswyldesolutions/vcv-web-component/define";
```

```html
<value-chain-visualiser data-src="/api/kpis"></value-chain-visualiser>
```

Without a bundler, load the single-file browser build instead, from your own
server (`@appswyldesolutions/vcv-web-component/browser`, i.e.
`dist/vcv.iife.js`) or a CDN:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@appswyldesolutions/vcv-web-component@1/dist/vcv.iife.js"
  defer
></script>
```

- Entries: `.` (no side effects), `./define` (registers the element) and
  `./browser` (the IIFE, exports on `window.ValueChainVisualiser`).
- Attributes, properties and events: the "Web component" section of
  [docs/specs/renderer.md](https://github.com/AppsWyldeSolutions/value-chain-visualiser/blob/main/docs/specs/renderer.md).
- React, Vue, Angular, Next.js and Express recipes:
  [docs/frameworks.md](https://github.com/AppsWyldeSolutions/value-chain-visualiser/blob/main/docs/frameworks.md).

MIT licensed. The bundled DM Sans and Bricolage Grotesque fonts are under the
SIL Open Font License; see `dist/licenses`.
