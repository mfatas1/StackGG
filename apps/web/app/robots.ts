import type { MetadataRoute } from "next";
import { SITE_URL as base } from "@/lib/site";

/**
 * Crawlers may index the marketing surfaces (home, /legal) but NOT the dynamic data
 * routes: those are effectively private (people's League data), infinite in number, and
 * every crawl of one costs a live Riot API call — disallowing them protects both privacy
 * and our rate budget. Defense-in-depth with the per-segment noindex metadata.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account", "/login", "/join/", "/stack/", "/player/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
