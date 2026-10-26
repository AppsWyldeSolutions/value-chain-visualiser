import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { HOSTED_URL } from "../packages/tableau-extension/src/manifest.js";

// .github/workflows/pages.yml deploys the Tableau extension to GitHub Pages.
// GitHub runs it, not this suite, so these check what it is set to do: deploy
// only what passed verify on main, built for the URL its .trex points at.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Step = {
  uses?: string;
  run?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
};
type Job = {
  if?: string;
  needs?: string | string[];
  permissions?: Record<string, string>;
  environment?: { name: string; url?: string };
  steps: Step[];
};
const workflow = parse(
  readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8"),
) as {
  on: {
    workflow_run?: { workflows: string[]; types: string[]; branches: string[] };
    workflow_dispatch?: unknown;
  };
  permissions: Record<string, string>;
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: Record<string, Job>;
};
const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
const step = (match: (step: Step) => boolean) => steps.find(match);

describe("GitHub Pages workflow", () => {
  it("runs once verify has finished on main, or by hand", () => {
    expect(workflow.on.workflow_run).toEqual({
      workflows: ["verify"],
      types: ["completed"],
      branches: ["main"],
    });
    expect("workflow_dispatch" in workflow.on).toBe(true);
  });

  it("deploys only when verify passed", () => {
    const build = workflow.jobs.build!;
    expect(build.if).toContain(
      "github.event.workflow_run.conclusion == 'success'",
    );
    expect(build.if).toContain("github.event_name == 'workflow_dispatch'");
  });

  it("never deploys a pull request's code, even from a fork's main", () => {
    // workflow_run's branch filter matches a fork's "main" too.
    const build = workflow.jobs.build!;
    expect(build.if).toContain("github.event.workflow_run.event == 'push'");
    expect(build.if).toContain(
      "github.event.workflow_run.head_repository.full_name == github.repository",
    );
  });

  it("builds the commit verify checked, not whatever main is now", () => {
    expect(
      step((s) => s.uses?.startsWith("actions/checkout@") ?? false)?.with?.ref,
    ).toBe("${{ github.event.workflow_run.head_sha || github.sha }}");
  });

  it("builds the extension for the URL its .trex points at", () => {
    const build = step((s) => s.run?.includes("npm run build") ?? false);
    for (const dir of [
      "core",
      "renderer",
      "web-component",
      "tableau-extension",
    ]) {
      expect(build?.run).toContain(`-w packages/${dir}`);
    }
    expect(build?.env?.TABLEAU_EXTENSION_URL).toBe(HOSTED_URL);
  });

  it("publishes the extension's dist/ under tableau/ on the repository's Pages site", () => {
    const repository = (
      JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
        repository: { url: string };
      }
    ).repository.url;
    const [, owner, repo] =
      /github\.com\/([^/]+)\/([^/.]+)/.exec(repository) ?? [];
    expect(HOSTED_URL).toBe(
      `https://${owner!.toLowerCase()}.github.io/${repo}/tableau/index.html`,
    );
    const stage = step((s) => s.run?.includes("_site") ?? false);
    expect(stage?.run).toContain(
      "cp -r packages/tableau-extension/dist _site/tableau",
    );
    expect(
      step((s) => s.uses?.startsWith("actions/upload-pages-artifact@") ?? false)
        ?.with?.path,
    ).toBe("_site");
    expect(
      step((s) => s.uses?.startsWith("actions/deploy-pages@") ?? false),
    ).toBeDefined();
  });

  it("asks for no more than Pages needs", () => {
    expect(workflow.permissions).toEqual({
      contents: "read",
      pages: "write",
      "id-token": "write",
    });
    expect(workflow.jobs.deploy?.environment?.name).toBe("github-pages");
    expect(workflow.concurrency).toEqual({
      group: "pages",
      "cancel-in-progress": false,
    });
  });
});
