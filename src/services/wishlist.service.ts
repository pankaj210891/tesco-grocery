import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import WishlistModel from "@/lib/db/models/wishlist.model";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import type { Product } from "@/types";

// ── Serialiser ────────────────────────────────────────────────────────────────

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
  await connectDB();
  const doc = await WishlistModel.findOne({ userId }).lean();
  if (!doc) return [];
  return dbProductsByIds((doc.productIds ?? []) as string[]);
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  await connectDB();
  await WishlistModel.findOneAndUpdate(
    { userId },
    { $addToSet: { productIds: productId } },
    { upsert: true }
  );
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await connectDB();
  await WishlistModel.findOneAndUpdate(
    { userId },
    { $pull: { productIds: productId } }
  );
}

export async function syncWishlist(userId: string, localProductIds: string[]): Promise<Product[]> {
  await connectDB();

  const doc = await WishlistModel.findOneAndUpdate(
    { userId },
    { $addToSet: { productIds: { $each: localProductIds } } },
    { upsert: true, new: true }
  );

  const mergedIds = (doc?.productIds ?? localProductIds) as string[];
  return dbProductsByIds(mergedIds);
}
