import type { MetadataRoute } from "next";

// Installable web app (PWA) — also the base for the internal mobile app test.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEYU Health", short_name: "NEYU", description: "Your health. Reimagined. Care, diagnostics, prevention and your private My Health Space.",
    start_url: "/my-health", scope: "/", display: "standalone", background_color: "#F7F6F2", theme_color: "#1B8FD0",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }, { src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
