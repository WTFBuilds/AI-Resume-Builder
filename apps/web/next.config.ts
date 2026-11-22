import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@airesume/db",
    "@airesume/auth",
    "@airesume/templates",
    "@airesume/ui",
    "@airesume/storage",
  ],
  eslint: { ignoreDuringBuilds: true },
};

export default config;
