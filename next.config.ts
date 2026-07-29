import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const basePath = isGitHubPages ? "/RiseOfDynasty" : "";

const nextConfig: NextConfig = {
  // GitHub Pages is static and serves this repository below /RiseOfDynasty.
  ...(isGitHubPages
    ? {
        output: "export",
        basePath,
        assetPrefix: `${basePath}/`,
        images: { unoptimized: true },
        // The existing Vinext build is the authoritative type-checking path.
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default nextConfig;
