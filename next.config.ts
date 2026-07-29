import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const isDesktopBuild = process.env.DESKTOP_BUILD === "true";
const isTapTapBuild = process.env.TAPTAP_BUILD === "true";
const basePath = isGitHubPages ? "/RiseOfDynasty" : "";

const nextConfig: NextConfig = {
  // GitHub Pages and the Electron shell both consume a static export. The
  // desktop build is served at localhost root, so it must not inherit the
  // repository base path used by GitHub Pages.
  ...(isGitHubPages || isDesktopBuild || isTapTapBuild
    ? {
        output: "export",
        ...(isGitHubPages
          ? { basePath, assetPrefix: `${basePath}/` }
          : isTapTapBuild
            ? { assetPrefix: "./" }
            : {}),
        images: { unoptimized: true },
        // The existing Vinext build is the authoritative type-checking path.
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default nextConfig;
