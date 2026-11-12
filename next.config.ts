import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully authenticated and data-driven, so every page renders on demand.
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer", "mariadb"],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
