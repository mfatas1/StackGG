import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_URL || "https://stackgg.app";

/**
 * Only the public marketing pages belong in the sitemap. Player/crew pages are private
 * and noindexed, so they're intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/legal`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
