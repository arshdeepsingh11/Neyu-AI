import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((r) => ({ url: `${SITE_URL}/${r.path}`.replace(/\/$/, "") || SITE_URL, lastModified: now, changeFrequency: r.freq, priority: r.priority }));
}
