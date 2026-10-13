---
"@AppsWyldeSolutions/vcv-renderer": minor
"@AppsWyldeSolutions/vcv-core": patch
---

Renderer: add the theme (`RendererTheme`, `defaultTheme`, `resolveTheme`, `themeToCssVars`, `applyTheme`), the `--vcv-*` stylesheet (`stylesText`, `installStyles`), the bundled DM Sans and Bricolage Grotesque fonts (`fontFaceCss`, `installFonts`) and `createShell`, which builds the empty visual: ocean background, header and card grid.

Core and renderer now declare `main`, `types` and `exports` pointing at `dist`, so the packages resolve from each other and from hosts.
