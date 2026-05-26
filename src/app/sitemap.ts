import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllProductSlugs } from "@/services/product.service";
import { getAllCategories } from "@/services/category.service";

const BASE = siteConfig.url;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE,                    lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
  { url: `${BASE}/products`,      lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
  { url: `${BASE}/categories`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE}/offers`,        lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
  { url: `${BASE}/store-locator`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/help`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/privacy`,       lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE}/terms`,         lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, categories] = await Promise.allSettled([
    getAllProductSlugs(),
    getAllCategories(),
  ]);

  const productEntries: MetadataRoute.Sitemap =
    slugs.status === "fulfilled"
      ? slugs.value.map((slug) => ({
          url:             `${BASE}/products/${slug}`,
          lastModified:    new Date(),
          changeFrequency: "daily" as const,
          priority:        0.7,
        }))
      : [];

  const categoryEntries: MetadataRoute.Sitemap =
    categories.status === "fulfilled"
      ? categories.value.map((cat) => ({
          url:             `${BASE}/categories/${cat.slug}`,
          lastModified:    new Date(),
          changeFrequency: "weekly" as const,
          priority:        0.75,
        }))
      : [];

  return [...STATIC_ROUTES, ...categoryEntries, ...productEntries];
}
