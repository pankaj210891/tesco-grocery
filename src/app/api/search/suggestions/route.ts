import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CategoryModel from "@/lib/db/models/category.model";
import ProductModel from "@/lib/db/models/product.model";
import {
  isAtlasSearchAvailable,
  atlasSearchSuggestions,
} from "@/lib/search/atlas-search";

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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return Response.json({ success: true, data: { categories: [], products: [], brands: [] } });
  }

  await connectDB();

  // ── Category suggestions always use regex (no Atlas index for categories) ──
  const regex = new RegExp(escapeRegex(q), "i");

  const rawCats = await CategoryModel.find({
    isActive: true,
    $or: [{ name: regex }, { slug: regex }, { description: regex }],
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

  // ── Product + brand suggestions: Atlas if available, regex fallback ─────────
  const atlasAvailable = await isAtlasSearchAvailable();

  if (atlasAvailable) {
    const { products, brands } = await atlasSearchSuggestions(q);
    // Only return Atlas results if they found something; otherwise fall through to regex
    if (products.length > 0 || brands.length > 0) {
      return Response.json({ success: true, data: { categories, products, brands } });
    }
  }

  // Regex fallback (also used when Atlas returns empty results)
  const rawProducts = await ProductModel.find({
    status: "approved",
    $or: [
      { name: regex },
      { brand: regex },
      { description: regex },
      { tags: regex },
      { category: regex },
      { subcategory: regex },
    ],
  })
    .select("name slug images price category brand")
    .limit(6)
    .lean<RawProduct[]>();

  const brandSet = new Set<string>();
  rawProducts.forEach((p) => {
    if (p.brand && regex.test(p.brand)) brandSet.add(p.brand);
  });

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
