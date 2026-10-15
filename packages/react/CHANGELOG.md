# @appswyldesolutions/vcv-react

## 1.0.0

First public release on npm.

- `<ValueChainVisualiser>`: a typed wrapper for `<value-chain-visualiser>`
  with `rows`, `year`, `period`, `theme` (`{ fillColor, shortfallColor }`),
  `onSelect`, `onChange`, `onError`, `className` and `style` props.
- A client component (`"use client"`) that renders the bare tag on the server
  and registers the element in the browser, so it works in the Next.js App
  Router. React 18 or later is a peer dependency.
