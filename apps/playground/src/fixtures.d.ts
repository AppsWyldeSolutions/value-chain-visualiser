// fixtures/ sits outside this package, so Vite resolves it through the
// @fixtures alias (see vite.config.mts) and TypeScript sees it as untyped JSON.
declare module "@fixtures/*.json" {
  const value: unknown;
  export default value;
}
