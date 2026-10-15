# Releasing to npm

Four packages go to public npm under the `@appswyldesolutions` scope:

| Package                                 | What it is                                               |
| --------------------------------------- | -------------------------------------------------------- |
| `@appswyldesolutions/vcv-core`          | KPI logic: ingestion, evaluation, the model              |
| `@appswyldesolutions/vcv-renderer`      | The vanilla DOM/SVG/CSS visual                           |
| `@appswyldesolutions/vcv-web-component` | `<value-chain-visualiser>`, core and renderer bundled in |
| `@appswyldesolutions/vcv-react`         | The React wrapper                                        |

Each has `publishConfig.access: "public"`, so anyone installs it with a plain
`npm install`: no token, `.npmrc` or registry setup.

## One-time setup

1. Create the `appswyldesolutions` organisation on npmjs.com (the free plan
   allows public packages) and add the publishing account to it.
2. Turn on two-factor auth for that account.

## Each release

1. Merge the "Version Packages" change: `npx changeset version` applies the
   pending changesets, bumps the versions and writes each `CHANGELOG.md`.
2. On an up-to-date `main`, log in and release:

   ```sh
   npm login
   npm run release
   ```

   `npm run release` runs `npm run verify`, then `scripts/release.mjs`:

   - `npm run check:pack` builds each package and fails if its tarball holds
     anything but its build, README, LICENSE and CHANGELOG.
   - It publishes, in order, core, renderer, web-component and react, so no
     published version depends on one that is not on npm yet. A version
     already on npm is skipped, so a release that stopped halfway can be run
     again.
   - `npx changeset tag` tags each published version in git.

   npm asks for the one-time password as it publishes.
   `npm run release -- --dry-run` goes through every step without publishing
   or tagging.

3. Push the tags: `git push --tags`.
4. Check the release the way a customer installs it, from npm with no auth
   and an empty cache:

   ```sh
   npm run e2e:consumers -- --registry
   ```

A published version cannot be changed, and can be unpublished only within 72
hours; its number can never be used again. Fix a bad release with a new
patch version.
