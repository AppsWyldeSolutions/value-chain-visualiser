import { execSync } from "node:child_process";

// browser.spec.ts loads the built IIFE, so build the web component once first.
export default function globalSetup(): void {
  execSync("npm run build -w packages/web-component", { stdio: "inherit" });
}
