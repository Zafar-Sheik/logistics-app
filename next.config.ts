import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully authenticated and data-driven, so every page renders on demand.
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer", "mariadb"],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
    // Reuse a page you visited in the last 30s when you go back to it. Saving
    // anything clears this straight away, so you always see your own changes.
    staleTimes: { dynamic: 30 },
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
