/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" produces a minimal, self-contained server build (server.js +
  // only the deps it needs) — ideal for self-hosting behind Docker/PM2/Nginx,
  // as opposed to Vercel-specific deployment. Run with: node .next/standalone/server.js
  output: "standalone",
  // Server-only packages loaded as-is (background worker + Redis).
  serverExternalPackages: ["bullmq", "ioredis"],
  images: {
    // Add remote domains here if physician photos / assets are ever served
    // from an external host instead of /public. Empty for now — all local.
    remotePatterns: [],
  },
};

module.exports = nextConfig;
