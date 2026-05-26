import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CategoryModel from "@/lib/db/models/category.model";
import ProductModel from "@/lib/db/models/product.model";
import {
  isAtlasSearchAvailable,
  atlasSearchSuggestions,
} from "@/lib/search/atlas-search";
import { normalizeQuery, buildRegexFilter } from "@/lib/search/search-utils";
import { logSearchQuery } from "@/lib/search/search-analytics";

export const dynamic = "force-dynamic";

type RawCat = { _id: { toString(): string }; name: string; slug: string; emoji?: string };
type RawProduct = {
  _id:      { toString(): string };
  name:     string;
  slug:     string;
  images?:  string[];
  price:    number;
  category: string;
  brand:    string;
};

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q") ?? "";
  const q   = normalizeQuery(raw); // trims, collapses whitespace, enforces 120-char max

  if (!q || q.length < 2) {
    return Response.json({ success: true, data: { categories: [], products: [], brands: [] } });
  }

  await connectDB();

  // ── Category suggestions always use regex (no Atlas index on categories collection) ──
  const rawCats = await CategoryModel.find({
    isActive: true,
    ...buildRegexFilter(q, ["name", "slug", "description"]),
  })
    .select("name slug emoji")
    .limit(4)
    .lean<RawCat[]>();

  const categories = rawCats.map((c) => ({
    _id:   c._id.toString(),
    name:  c.name,
    slug:  c.slug,
    emoji: c.emoji ?? "📦",
  }));

  // ── Product + brand suggestions: Atlas if available, regex fallback ──────────
  const atlasAvailable = await isAtlasSearchAvailable();

  if (atlasAvailable) {
    const { products, brands } = await atlasSearchSuggestions(q);
    if (products.length > 0 || brands.length > 0) {
      // Analytics hook: fire-and-forget, do not await
      void logSearchQuery(q, products.length);
      return Response.json({ success: true, data: { categories, products, brands } });
    }
  }

  // Regex fallback (also used when Atlas returns empty results)
  const PRODUCT_FIELDS = ["name", "brand", "description", "tags", "category", "subcategory"];

  const rawProducts = await ProductModel.find({
    status: "approved",
    ...buildRegexFilter(q, PRODUCT_FIELDS),
  })
    .select("name slug images price category brand")
    .limit(6)
    .lean<RawProduct[]>();

  const lowerQ   = q.toLowerCase();
  const brandSet = new Set<string>();
  rawProducts.forEach((p) => {
    if (p.brand && p.brand.toLowerCase().includes(lowerQ)) brandSet.add(p.brand);
  });

  // Analytics hook: fire-and-forget
  void logSearchQuery(q, rawProducts.length);

  return Response.json({
    success: true,
    data: {
      categories,
      products: rawProducts.map((p) => ({
        _id:      p._id.toString(),
        name:     p.name,
        slug:     p.slug,
        image:    Array.isArray(p.images) ? (p.images[0] ?? "") : "",
        price:    p.price,
        category: p.category,
        brand:    p.brand,
      })),
      brands: Array.from(brandSet).slice(0, 3),
    },
  });
}
