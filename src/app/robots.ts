import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep internal API routes out of the index.
      disallow: ["/api/"],
    },
    sitemap: "https://andrewlass.com/sitemap.xml",
  };
}
