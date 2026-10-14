# Consumer smoke tests

Small apps that use the published packages the way a customer would: each
installs the tarballs from `npm pack`, not the workspace source. They are not
npm workspaces (the root's `apps/*` glob does not reach them).

| App       | Uses                                          | Recipe                                |
| --------- | --------------------------------------------- | ------------------------------------- |
| `express` | `vcv-web-component` (the `./browser` IIFE)    | "Express" in `docs/frameworks.md`     |
| `next`    | `vcv-react` (and `vcv-web-component` with it) | "Next.js App Router" in the same file |

Run them with:

```sh
npm run e2e:consumers
```

That packs the packages into `.consumers/`, installs the tarballs into each
app (no lockfile, nothing saved to `package.json`), builds the Next.js app and
runs `apps/consumers/e2e` with `playwright.consumers.config.ts`. It needs
network access to install `express` and `next`, so it is not part of
`npm run e2e`.
