import { resolve } from "node:path";
import type { NextConfig } from "next";

const appRoot = resolve(__dirname);

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
