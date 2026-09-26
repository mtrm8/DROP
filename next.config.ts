import type { NextConfig } from "next";

const basePath = "/DROP";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: `${basePath}/`,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io", pathname: "/football/teams/*.png" }],
  },
};

export default nextConfig;
