import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

const siteUrl = siteConfig.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/docs"],
      // Sessions are private and ephemeral; the API is not a browseable surface.
      disallow: ["/api/", "/session/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
