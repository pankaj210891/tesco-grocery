import mongoose from "mongoose";
import { connectDB, isDBConfigured } from "@/lib/db/mongoose";
import WishlistModel from "@/lib/db/models/wishlist.model";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import { mockAllProducts } from "@/lib/data/mock-products";
import type { Product } from "@/types";

// ── Serialise a ProductDoc lean result to the shared Product type ─────────────

function toProduct(doc: ProductDoc): Product {
  return {
    _id:           doc._id.toString(),
    name:          doc.name,
    slug:          doc.slug,
    description:   doc.description,
    price:         doc.price,
    originalPrice: doc.originalPrice ?? undefined,
    images:        (doc.images ?? []) as string[],
    category:      doc.category,
    brand:         doc.brand,
    unit:          doc.unit,
    inStock:       doc.inStock ?? true,
    rating:        doc.rating ?? 0,
    reviewCount:   doc.reviewCount ?? 0,
    tags:          (doc.tags ?? []) as string[],
    createdAt:     doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt:     doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

function mockProductsByIds(ids: string[]): Product[] {
  return mockAllProducts.filter((p) => ids.includes(p._id));
}

async function dbProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const objectIds = ids
    .map((id) => { try { return new mongoose.Types.ObjectId(id); } catch { return null; } })
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const docs = await ProductModel.find({ _id: { $in: objectIds } }).lean<ProductDoc[]>();
  return docs.map(toProduct);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getWishlistProducts(userId: string): Promise<Product[]> {
  if (!isDBConfigured()) return [];
  await connectDB();
  const doc = await WishlistModel.findOne({ userId }).lean();
  if (!doc) return [];
  return dbProductsByIds((doc.productIds ?? []) as string[]);
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  if (!isDBConfigured()) return;
  await connectDB();
  await WishlistModel.findOneAndUpdate(
    { userId },
    { $addToSet: { productIds: productId } },
    { upsert: true }
  );
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  if (!isDBConfigured()) return;
  await connectDB();
  await WishlistModel.findOneAndUpdate(
    { userId },
    { $pull: { productIds: productId } }
  );
}

/**
 * Merge local productIds with whatever is already stored for this user.
 * Returns the full merged product list so the client can update its store.
 */
export async function syncWishlist(userId: string, localProductIds: string[]): Promise<Product[]> {
  if (!isDBConfigured()) {
    return mockProductsByIds(localProductIds);
  }

  await connectDB();

  const existing = await WishlistModel.findOne({ userId }).lean();
  const serverIds  = ((existing?.productIds ?? []) as string[]);
  const mergedIds  = Array.from(new Set([...serverIds, ...localProductIds]));

  await WishlistModel.findOneAndUpdate(
    { userId },
    { productIds: mergedIds },
    { upsert: true }
  );

  return dbProductsByIds(mergedIds);
}
