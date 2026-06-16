import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const isGHPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  // Static export pouze pro GitHub Pages build (bez API routes)
  ...(isGHPages ? {
    output: "export",
    trailingSlash: true,
    basePath: isProd ? "/Food-factory" : "",
    assetPrefix: isProd ? "/Food-factory/" : "",
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
