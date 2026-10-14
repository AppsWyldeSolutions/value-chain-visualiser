---
"@AppsWyldeSolutions/vcv-react": minor
"@AppsWyldeSolutions/vcv-web-component": minor
---

React: add `<ValueChainVisualiser>`, a typed wrapper for `<value-chain-visualiser>` with `rows`, `year`, `period`, `theme` (`{ fillColor, shortfallColor }`), `onSelect`, `onChange`, `onError`, `className` and `style` props. It is a client component (`"use client"`) that renders the bare tag on the server and registers the element in the browser, so it works in the Next.js App Router. React 18 or later is a peer dependency.

Web component: export the `KpiRow` type, so hosts can type the `rows` property without installing core.
