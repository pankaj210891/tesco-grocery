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
  try {
    await connectDB();
    const doc = await CartModel.findOne({ userId: auth.userId }).lean();
    const items = await buildCartItems((doc?.items ?? []) as { productId: string; quantity: number }[]);
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error("[cart GET]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch cart" }, { status: 500 });
  }
}

// POST /api/account/cart  — { productId, quantity }  sets quantity for that item
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let body: { productId?: string; quantity?: number };
  try { body = await req.json() as { productId?: string; quantity?: number }; }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 }); }

  const { productId, quantity } = body;
  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ success: false, error: "productId and quantity (≥1) required" }, { status: 422 });
  }

  try {
    await connectDB();

    // Try to update quantity on an existing item in the cart
    let doc = await CartModel.findOneAndUpdate(
      { userId: auth.userId, "items.productId": productId },
      { $set: { "items.$.quantity": quantity } },
      { new: true },
    ).lean();

    if (!doc) {
      // Item not in cart yet — push it (upsert creates the cart document if absent)
      doc = await CartModel.findOneAndUpdate(
        { userId: auth.userId },
        { $push: { items: { productId, quantity } } },
        { upsert: true, new: true },
      ).lean();
    }

    const items = await buildCartItems((doc?.items ?? []) as { productId: string; quantity: number }[]);
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error("[cart POST]", err);
    return NextResponse.json({ success: false, error: "Failed to update cart" }, { status: 500 });
  }
}

// DELETE /api/account/cart  — clear all
export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    await CartModel.findOneAndUpdate({ userId: auth.userId }, { $set: { items: [] } });
    return NextResponse.json({ success: true, data: [] });
  } catch (err) {
    console.error("[cart DELETE]", err);
    return NextResponse.json({ success: false, error: "Failed to clear cart" }, { status: 500 });
  }
}
