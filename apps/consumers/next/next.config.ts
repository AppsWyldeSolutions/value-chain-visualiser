import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  // This app sits inside the monorepo but must resolve everything from its
  // own node_modules (the packed tarballs), never the workspace's.
  turbopack: { root: path.resolve(".") },
  outputFileTracingRoot: path.resolve("."),
};

export default config;
