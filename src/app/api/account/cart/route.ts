import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import CartModel from "@/lib/db/models/cart.model";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import type { CartItem, Product, ProductVariant } from "@/types";

type RawCartItem = { productId: string; variantId?: string | null; quantity: number };

async function buildCartItems(items: RawCartItem[]): Promise<CartItem[]> {
  if (!items.length) return [];
  const ids = items
    .map((i) => { try { return new mongoose.Types.ObjectId(i.productId); } catch { return null; } })
    .filter(Boolean) as mongoose.Types.ObjectId[];
  if (!ids.length) return [];

  const docs = await ProductModel.find({ _id: { $in: ids } }).lean<ProductDoc[]>();
  const map  = new Map(docs.map((d) => [d._id.toString(), d]));

  return items
    .map((i) => {
      const d = map.get(i.productId);
      if (!d) return null;

      // Resolve the selected variant from the product's variants array
      let selectedVariant: ProductVariant | undefined;
      if (i.variantId && (d.variants as unknown[])?.length) {
        const raw = (d.variants as Array<{
          _id: { toString(): string };
          label: string; sku: string;
          price: number | null; originalPrice: number | null;
          stockQuantity: number | null; inStock: boolean;
        }>).find((v) => v._id.toString() === i.variantId);
        if (raw) {
          selectedVariant = {
            _id: raw._id.toString(), label: raw.label, sku: raw.sku,
            price: raw.price, originalPrice: raw.originalPrice,
            stockQuantity: raw.stockQuantity, inStock: raw.inStock,
          };
        }
      }

      const product: Product = {
        _id: d._id.toString(), name: d.name, slug: d.slug, description: d.description,
        price: d.price, originalPrice: d.originalPrice ?? undefined,
        images: (d.images ?? []) as string[], category: d.category, brand: d.brand,
        unit: d.unit, inStock: d.inStock ?? true, rating: d.rating ?? 0,
        reviewCount: d.reviewCount ?? 0, tags: (d.tags ?? []) as string[],
        badge: d.badge as Product["badge"] ?? null,
        vendorId: d.vendorId?.toString() ?? null,
        vendorName: (d.vendorName as string) ?? null,
        variants: (d.variants as unknown as ProductVariant[]) ?? [],
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
        updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
      };

      return { product, quantity: i.quantity, variantId: i.variantId ?? null, selectedVariant };
    })
    .filter(Boolean) as CartItem[];
}

// GET /api/account/cart
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const doc   = await CartModel.findOne({ userId: auth.userId }).lean();
    const items = await buildCartItems((doc?.items ?? []) as RawCartItem[]);
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error("[cart GET]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch cart" }, { status: 500 });
  }
}

// POST /api/account/cart  — { productId, variantId?, quantity }  sets quantity for that slot
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let body: { productId?: string; variantId?: string | null; quantity?: number };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 }); }

  const { productId, quantity } = body;
  const variantId = body.variantId ?? null;

  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ success: false, error: "productId and quantity (≥1) required" }, { status: 422 });
  }

  try {
    await connectDB();

    // Validate availability before mutating cart
    type StockVariant = { _id: { toString(): string }; inStock: boolean };
    const stockDoc = await ProductModel
      .findById(productId, { inStock: 1, variants: 1 })
      .lean<{ inStock: boolean; variants?: StockVariant[] }>();
    if (!stockDoc) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }
    if (variantId) {
      const variant = stockDoc.variants?.find((v) => v._id.toString() === variantId);
      if (!variant || !variant.inStock) {
        return NextResponse.json({ success: false, error: "This variant is currently out of stock" }, { status: 422 });
      }
    } else if (!stockDoc.inStock) {
      return NextResponse.json({ success: false, error: "Product is currently out of stock" }, { status: 422 });
    }

    // Use $elemMatch so the positional $ targets the exact slot (productId + variantId pair)
    let doc = await CartModel.findOneAndUpdate(
      { userId: auth.userId, items: { $elemMatch: { productId, variantId } } },
      { $set: { "items.$.quantity": quantity } },
      { new: true },
    ).lean();

    if (!doc) {
      // Slot not found — add as a new line
      doc = await CartModel.findOneAndUpdate(
        { userId: auth.userId },
        { $push: { items: { productId, variantId, quantity } } },
        { upsert: true, new: true },
      ).lean();
    }

    const items = await buildCartItems((doc?.items ?? []) as RawCartItem[]);
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
