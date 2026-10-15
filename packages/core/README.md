# @appswyldesolutions/vcv-core

The KPI logic behind the Value Chain Visualiser, with no DOM and no framework:
read KPI rows (`fromLongRows`, `fromWideRecords`), evaluate them against
budget (`evaluate`, `formatValues`) and group them into the value chain
model for a year and period (`buildModel`).

```sh
npm install @appswyldesolutions/vcv-core
```

It is public on npm: no token, `.npmrc` or registry setup.

```ts
import { buildModel, fromLongRows } from "@appswyldesolutions/vcv-core";

const model = buildModel(fromLongRows(records), { year: 2026, period: "July" });
```

- `Equal`: actual >= budget is on target. `LessThan`: actual <= budget is on
  target.
- A sphere's fill is `clamp(actual / budget, 0, 1)`.

To draw the visual, use
[@appswyldesolutions/vcv-web-component](https://www.npmjs.com/package/@appswyldesolutions/vcv-web-component)
or [@appswyldesolutions/vcv-react](https://www.npmjs.com/package/@appswyldesolutions/vcv-react).
Specs: [docs/specs](https://github.com/AppsWyldeSolutions/value-chain-visualiser/tree/main/docs/specs).

MIT licensed.
