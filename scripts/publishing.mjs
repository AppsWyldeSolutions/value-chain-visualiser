// What the release and the pack check share: which packages go to npm, in
// which order, and what each tarball may contain.

/**
 * packages/* folders in the order they are published. Each comes after every
 * sibling it depends on, devDependencies included (web-component bundles core
 * and the renderer), so no published version ever points at one that is not
 * on npm yet.
 */
export const RELEASE_ORDER = ["core", "renderer", "web-component", "react"];

// npm adds package.json itself; README, LICENSE and CHANGELOG are the only
// other top-level files a tarball carries.
const TOP_LEVEL = new Set([
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
]);

/**
 * Problems with a tarball's file list, given the folders in the package's
 * `files` allowlist. An empty array means the tarball is fit to publish.
 *
 * @param {string[]} files paths inside the tarball, relative to its root
 * @param {string[]} folders top-level folders the package may ship
 * @returns {string[]}
 */
export function packFileProblems(files, folders) {
  const problems = [];
  for (const file of files) {
    const top = file.split("/")[0];
    const allowed = file.includes("/")
      ? folders.includes(top)
      : TOP_LEVEL.has(file);
    if (!allowed || /\.test\.|(^|\/)testHelpers\./.test(file)) {
      problems.push(`ships ${file}`);
    }
  }
  for (const required of ["README.md", "LICENSE"]) {
    if (!files.includes(required)) problems.push(`is missing ${required}`);
  }
  if (!files.some((file) => file.startsWith("dist/"))) {
    problems.push("is missing dist/");
  }
  return problems;
}
