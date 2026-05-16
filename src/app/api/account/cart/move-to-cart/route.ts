import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import CartModel from "@/lib/db/models/cart.model";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import type { CartItem, Product } from "@/types";

const BodySchema = z.object({ productId: z.string().min(1) });

async function buildCartItems(items: { productId: string; quantity: number }[]): Promise<CartItem[]> {
  if (!items.length) return [];
  const ids = items
    .map((i) => { try { return new mongoose.Types.ObjectId(i.productId); } catch { return null; } })
    .filter(Boolean) as mongoose.Types.ObjectId[];
  if (!ids.length) return [];
  const docs = await ProductModel.find({ _id: { $in: ids } }).lean<ProductDoc[]>();
  const map = new Map(docs.map((d) => [d._id.toString(), d]));
  return items
    .map((i) => {
      const d = map.get(i.productId);
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
      return { product, quantity: i.quantity };
    })
    .filter(Boolean) as CartItem[];
}

// POST /api/account/cart/move-to-cart  — moves savedItem → cart
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 422 });
  }
  const { productId } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ success: false, error: "Invalid productId" }, { status: 422 });
  }

  try {
    await connectDB();

    // Validate product exists and is in stock before mutating cart
    const product = await ProductModel.findById(productId, { inStock: 1 }).lean<{ inStock?: boolean }>();
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }
    if (!product.inStock) {
      return NextResponse.json(
        { success: false, error: "Product is currently out of stock" },
        { status: 422 }
      );
    }

    // Remove from savedItems
    await CartModel.findOneAndUpdate(
      { userId: auth.userId },
      { $pull: { savedItems: { productId } } },
      { upsert: true }
    );

    // Check if already in cart, else push with quantity 1
    let doc = await CartModel.findOneAndUpdate(
      { userId: auth.userId, "items.productId": productId },
      { $inc: { "items.$.quantity": 1 } },
      { new: true }
    ).lean();

    if (!doc) {
      doc = await CartModel.findOneAndUpdate(
        { userId: auth.userId },
        { $push: { items: { productId, quantity: 1 } } },
        { upsert: true, new: true }
      ).lean();
    }

    const items = await buildCartItems(
      (doc?.items ?? []) as { productId: string; quantity: number }[]
    );
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error("[cart move-to-cart POST]", err);
    return NextResponse.json({ success: false, error: "Failed to move item to cart" }, { status: 500 });
  }
}
