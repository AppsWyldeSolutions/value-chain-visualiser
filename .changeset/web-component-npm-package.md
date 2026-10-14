---
"@AppsWyldeSolutions/vcv-web-component": major
---

Package the web component for npm. One install: core and the renderer are bundled in, so the package has no runtime dependencies. It ships ESM, CJS and type declarations, plus `./browser` (`dist/vcv.iife.js`), a single file for a `<script>` tag that puts the exports on `window.ValueChainVisualiser`.

**Breaking:** importing the package root no longer registers `<value-chain-visualiser>`. Import `@AppsWyldeSolutions/vcv-web-component/define` instead, or call `defineValueChainVisualiser()`. Only the define entry has side effects, so bundlers can tree-shake the rest.
