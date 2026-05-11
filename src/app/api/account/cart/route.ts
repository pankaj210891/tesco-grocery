import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import CartModel from "@/lib/db/models/cart.model";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import type { CartItem, Product } from "@/types";

async function buildCartItems(items: { productId: string; quantity: number }[]): Promise<CartItem[]> {
  if (!items.length) return [];
  const ids = items
    .map((i) => { try { return new mongoose.Types.ObjectId(i.productId); } catch { return null; } })
    .filter(Boolean) as mongoose.Types.ObjectId[];
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
        badge: d.badge as Product["badge"] ?? null,
        vendorId: d.vendorId?.toString() ?? null,
        vendorName: (d.vendorName as string) ?? null,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
        updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
      };
      return { product, quantity: i.quantity };
    })
    .filter(Boolean) as CartItem[];
}

// GET /api/account/cart
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const doc = await CartModel.findOne({ userId: auth.userId }).lean();
  const items = await buildCartItems((doc?.items ?? []) as { productId: string; quantity: number }[]);
  return NextResponse.json({ success: true, data: items });
}

// POST /api/account/cart  — { productId, quantity }  sets quantity for that item
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { productId?: string; quantity?: number };
  const { productId, quantity } = body;
  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ success: false, error: "productId and quantity (≥1) required" }, { status: 422 });
  }
  await connectDB();
  const doc = await CartModel.findOne({ userId: auth.userId });
  if (doc) {
    const idx = doc.items.findIndex((i: { productId: string }) => i.productId === productId);
    if (idx >= 0) { doc.items[idx].quantity = quantity; }
    else { doc.items.push({ productId, quantity }); }
    await doc.save();
  } else {
    await CartModel.create({ userId: auth.userId, items: [{ productId, quantity }] });
  }
  const updated = await CartModel.findOne({ userId: auth.userId }).lean();
  const items = await buildCartItems((updated?.items ?? []) as { productId: string; quantity: number }[]);
  return NextResponse.json({ success: true, data: items });
}

// DELETE /api/account/cart  — clear all
export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  await connectDB();
  await CartModel.findOneAndUpdate({ userId: auth.userId }, { $set: { items: [] } });
  return NextResponse.json({ success: true, data: [] });
}
