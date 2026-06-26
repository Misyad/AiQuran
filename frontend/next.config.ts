import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Disable static generation to avoid prerender issues
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
