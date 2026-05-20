import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import CartModel from "@/lib/db/models/cart.model";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import type { Product, SavedCartItem } from "@/types";

const BodySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
});

async function buildSavedItems(
  saved: { productId: string; savedAt: Date }[]
): Promise<SavedCartItem[]> {
  if (!saved.length) return [];
  const ids = saved
    .map(({ productId }) => {
      try { return new mongoose.Types.ObjectId(productId); } catch { return null; }
    })
    .filter(Boolean) as mongoose.Types.ObjectId[];
  if (!ids.length) return [];
  const docs = await ProductModel.find(
    { _id: { $in: ids } },
    { name: 1, slug: 1, price: 1, originalPrice: 1, images: 1, brand: 1, unit: 1,
      inStock: 1, rating: 1, reviewCount: 1, tags: 1, badge: 1, category: 1,
      vendorId: 1, vendorName: 1, description: 1, createdAt: 1, updatedAt: 1 }
  ).lean<ProductDoc[]>();

  const map = new Map(docs.map((d) => [d._id.toString(), d]));

  return saved
    .map(({ productId, savedAt }) => {
      const d = map.get(productId);
      if (!d) return null;
      const product: Product = {
        _id: d._id.toString(), name: d.name, slug: d.slug, description: d.description,
        price: d.price, originalPrice: d.originalPrice ?? undefined,
        images: (d.images ?? []) as string[], category: d.category, brand: d.brand,
        unit: d.unit, inStock: d.inStock ?? true, rating: d.rating ?? 0,
        reviewCount: d.reviewCount ?? 0, tags: (d.tags ?? []) as string[],
        badge: (d.badge as Product["badge"]) ?? null,
        vendorId: d.vendorId?.toString() ?? null,
        vendorName: (d.vendorName as string) ?? null,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
        updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
      };
      return { product, savedAt: savedAt instanceof Date ? savedAt.toISOString() : String(savedAt) };
    })
    .filter(Boolean) as SavedCartItem[];
}

// POST /api/account/cart/save-for-later  — moves item from cart → savedItems
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 422 });
  }
  const { productId, variantId = null } = parsed.data;

  try {
    await connectDB();
    // Remove the specific variant slot from cart; keep savedItems product-level
    const pullCondition = variantId ? { productId, variantId } : { productId };
    await CartModel.findOneAndUpdate(
      { userId: auth.userId },
      {
        $pull: { items: pullCondition, savedItems: { productId } },
      },
      { upsert: true }
    );
    const doc = await CartModel.findOneAndUpdate(
      { userId: auth.userId },
      { $push: { savedItems: { productId, savedAt: new Date() } } },
      { new: true }
    ).lean();

    const savedItems = await buildSavedItems(
      (doc?.savedItems ?? []) as { productId: string; savedAt: Date }[]
    );
    return NextResponse.json({ success: true, data: savedItems });
  } catch (err) {
    console.error("[cart save-for-later POST]", err);
    return NextResponse.json({ success: false, error: "Failed to save item" }, { status: 500 });
  }
}

// GET /api/account/cart/save-for-later  — fetch saved items
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const doc = await CartModel.findOne({ userId: auth.userId }).lean();
    const savedItems = await buildSavedItems(
      (doc?.savedItems ?? []) as { productId: string; savedAt: Date }[]
    );
    return NextResponse.json({ success: true, data: savedItems });
  } catch (err) {
    console.error("[cart save-for-later GET]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch saved items" }, { status: 500 });
  }
}
