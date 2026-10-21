/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" produces a minimal, self-contained server build (server.js +
  // only the deps it needs) — ideal for self-hosting behind Docker/PM2/Nginx,
  // as opposed to Vercel-specific deployment. Run with: node .next/standalone/server.js
  output: "standalone",
  // Server-only packages loaded as-is (background worker + Redis).
  serverExternalPackages: ["bullmq", "ioredis"],
  // Files in /public have no version in their name, so browsers keep them a week and
  // refresh quietly in the background (nginx adds the same for its own static routes).
  async headers() {
    const week = "public, max-age=604800, stale-while-revalidate=86400";
    return [
      { source: "/videos/:path*", headers: [{ key: "Cache-Control", value: week }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: week }] },
      { source: "/:all*(png|jpg|jpeg|webp|svg|ico)", headers: [{ key: "Cache-Control", value: week }] },
    ];
  },
  // Smaller responses for every page and API answer.
  compress: true,
  poweredByHeader: false,
  images: {
    // Add remote domains here if physician photos / assets are ever served
    // from an external host instead of /public. Empty for now — all local.
    remotePatterns: [],
  },
};

module.exports = nextConfig;
