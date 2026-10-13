import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Search engines and AI answer engines may read public pages; private areas never.
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/my-health", "/api/", "/share/", "/connect/", "/app-start"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // AI answer engines (AEO / GEO): explicitly welcome on public pages.
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"], allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
