import type { MetadataRoute } from "next";

/**
 * Public base URL of the site. Set NEXT_PUBLIC_SITE_URL at build time to the
 * real production origin before launch; the fallback keeps local builds valid.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://arogya-relay.pages.dev"
).replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal framework endpoints carry no useful public content.
        disallow: ["/_vinext/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
