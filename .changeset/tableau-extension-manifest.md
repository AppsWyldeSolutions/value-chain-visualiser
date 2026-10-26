---
"@appswyldesolutions/vcv-tableau-extension": minor
---

Tableau extension: `npm run build` writes the hosted `.trex` manifest
(`dist/value-chain-visualiser.trex`) beside the built page, pointed at
`TABLEAU_EXTENSION_URL` (a placeholder until hosting exists), and
`npm start` writes the localhost one. Its `extension-version` is this
package's version, and it has a 70x70 icon. The package stays private:
versioned here, never published to npm.
