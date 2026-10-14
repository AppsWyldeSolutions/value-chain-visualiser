# Value Chain Visualiser

A glass-and-spheres KPI visual for business-process value chains. One core, two hosts:
web component (any Node.js web app) and Power BI custom visual.

## Commands

- `npm run verify` lint + typecheck + unit tests + build. Must pass before every commit.
- `npm run e2e` Playwright visual tests against apps/playground.
- `npm run dev -w apps/playground` local playground.
- `npm run e2e:consumers` packs the packages, installs the tarballs into
  apps/consumers/* (Express, Next.js) and runs their Playwright smoke tests.
  Needs network access; not part of `npm run e2e`.

## Architecture rules (never break)

1. packages/core has no DOM, no framework, no Power BI imports.
2. packages/renderer uses vanilla DOM/SVG/CSS only. No React, no Power BI imports.
3. Only web-component, react and powerbi-visual know their host.
4. No network calls at runtime in core, renderer or the Power BI/Tableau
   wrappers. The one exception is packages/web-component, which may fetch the
   URL its host page names in data-src. No eval, no innerHTML with data-derived
   strings (Power BI sandbox and certification rules). Use textContent and
   createElement.
5. All colours, sizes and fonts come from the theme object, never hard-coded in logic.

## Domain rules

- Equal operator: actual >= budget is on target. LessThan: actual <= budget is on target.
- Sphere fill = clamp(actual / budget, 0, 1). Budget is a full sphere.
- On target uses fillColor; missed uses shortfallColor. Both are user-configurable.
- Reference behaviour lives in docs/prototype/Main.dc.html. Match it unless a spec says otherwise.

## Definition of done

- Acceptance criteria in the issue are covered by tests.
- `npm run verify` and `npm run e2e` pass. Screenshots updated only when the change is intended.
- A change to packaging config in core, renderer, web-component or react
  (package.json name/exports/files/sideEffects/dependencies, tsup config,
  build or pack scripts) also passes `npm run e2e:consumers`, run as part of
  that issue's own verification. Same idea as running the pbi-compliance
  agent before merging changes to core, renderer or powerbi-visual.
- Public API changes have a changeset (`npx changeset`) and a docs/ update.
- Small PRs: one issue, one branch (`feat/<issue>-slug`), conventional commit messages.

## Do not

- Edit dist/ or lockfiles by hand. Skip hooks. Force-push. Commit secrets.
