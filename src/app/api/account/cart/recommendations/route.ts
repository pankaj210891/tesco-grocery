import { type NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import type { CartRecommendation } from "@/types";

// GET /api/account/cart/recommendations?excludeIds=id1,id2&categories=cat1,cat2&limit=8
// Public — returns catalog data only, no user-specific information.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const excludeRaw  = searchParams.get("excludeIds") ?? "";
  const categoryRaw = searchParams.get("categories") ?? "";
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "8", 10), 16);

  const excludeIds = excludeRaw
    .split(",")
    .filter(Boolean)
    .map((id) => { try { return new mongoose.Types.ObjectId(id.trim()); } catch { return null; } })
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const categories = categoryRaw.split(",").map((c) => c.trim()).filter(Boolean);

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      inStock: true,
      status:  "approved",
      ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
      ...(categories.length > 0  && { category: { $in: categories } }),
    };

    const docs = await ProductModel.find(query, {
      name: 1, slug: 1, price: 1, originalPrice: 1, images: 1, brand: 1,
      unit: 1, rating: 1, inStock: 1, badge: 1, vendorName: 1,
    })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .lean<ProductDoc[]>();

    const data: CartRecommendation[] = docs.map((d) => ({
      _id:           d._id.toString(),
      name:          d.name,
      slug:          d.slug,
      price:         d.price,
      originalPrice: d.originalPrice ?? undefined,
      images:        (d.images ?? []) as string[],
      brand:         d.brand,
      unit:          d.unit,
      rating:        d.rating ?? 0,
      inStock:       d.inStock ?? true,
      badge:         (d.badge as CartRecommendation["badge"]) ?? null,
      vendorName:    (d.vendorName as string) ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[cart recommendations GET]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
