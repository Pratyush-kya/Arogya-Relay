import type { MetadataRoute } from "next";
import { SITE_URL } from "./robots";

/**
 * Sitemap. The prototype is a single dashboard route today; add entries here as
 * the privacy, terms, and contact pages are published.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
