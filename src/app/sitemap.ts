import type { MetadataRoute } from "next";

const BASE = "https://andrewlass.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE}/resume`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/portfolio`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/security`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/tools`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
