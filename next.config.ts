import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/DROP",
  assetPrefix: "/DROP/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;