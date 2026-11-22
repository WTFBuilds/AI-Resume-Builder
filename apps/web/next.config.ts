import type { NextConfig } from "next";

// Vercel manages the output itself; standalone is for our Docker/ECS path.
const isVercel = process.env.VERCEL === "1";

const config: NextConfig = {
  output: isVercel ? undefined : "standalone",
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
