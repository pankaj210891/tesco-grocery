import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import ProductModel from "@/lib/db/models/product.model";

export interface StockItem {
  productId: string;
  variantId?: string | null;
  quantity:  number;
}

type VariantLean = {
  _id: { toString(): string };
  label: string;
  inStock: boolean;
  stockQuantity?: number | null;
};

type ProductLean = {
  _id: { toString(): string };
  name: string;
  inStock: boolean;
  stockQuantity?: number | null;
  variants?: VariantLean[];
};

export interface StockCheckResult {
  ok:          boolean;
  unavailable: { productId: string; name: string; available: number; requested: number }[];
}

/**
 * Checks whether all requested quantities can be fulfilled.
 * When variantId is present the check is against the variant's own stock fields;
 * otherwise the product-level fields are used.
 */
export async function checkStock(items: StockItem[]): Promise<StockCheckResult> {
  await connectDB();

  const ids = items.map((i) => i.productId);
  const products = await ProductModel
    .find({ _id: { $in: ids } })
    .select("_id name inStock stockQuantity variants")
    .lean<ProductLean[]>();

  const unavailable: StockCheckResult["unavailable"] = [];

  for (const item of items) {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product) {
      unavailable.push({ productId: item.productId, name: "Unknown product", available: 0, requested: item.quantity });
      continue;
    }

    if (item.variantId) {
      const variant = product.variants?.find((v) => v._id.toString() === item.variantId);
      if (!variant || !variant.inStock) {
        unavailable.push({ productId: item.productId, name: product.name, available: 0, requested: item.quantity });
        continue;
      }
      if (typeof variant.stockQuantity === "number" && variant.stockQuantity < item.quantity) {
        unavailable.push({ productId: item.productId, name: `${product.name} (${variant.label})`, available: variant.stockQuantity, requested: item.quantity });
      }
      continue;
    }

    // Product-level (no variant selected)
    if (!product.inStock) {
      unavailable.push({ productId: item.productId, name: product.name, available: 0, requested: item.quantity });
      continue;
    }
    if (typeof product.stockQuantity === "number" && product.stockQuantity < item.quantity) {
      unavailable.push({ productId: item.productId, name: product.name, available: product.stockQuantity, requested: item.quantity });
    }
  }

  return { ok: unavailable.length === 0, unavailable };
}

/**
 * Atomically decrements stockQuantity for each item.
 * For variant items: decrements the variant sub-document and marks it out-of-stock when 0.
 * For product-level items: decrements product stockQuantity and marks product out-of-stock.
 */
export async function decrementStock(items: StockItem[]): Promise<void> {
  await connectDB();

  await Promise.all(
    items.map(async (item) => {
      if (item.variantId) {
        const variantObjId = new mongoose.Types.ObjectId(item.variantId);
        const result = await ProductModel.findOneAndUpdate(
          {
            _id:      item.productId,
            variants: { $elemMatch: { _id: variantObjId, stockQuantity: { $gte: item.quantity } } },
          },
          { $inc: { "variants.$.stockQuantity": -item.quantity } },
          { new: true },
        );
        if (result) {
          const v = (result.variants as VariantLean[] | undefined)
            ?.find((v) => v._id.toString() === item.variantId);
          if (v && typeof v.stockQuantity === "number" && v.stockQuantity <= 0) {
            await ProductModel.findOneAndUpdate(
              { _id: item.productId, "variants._id": variantObjId },
              { $set: { "variants.$.inStock": false } },
            );
          }
        }
        return;
      }

      const result = await ProductModel.findOneAndUpdate(
        { _id: item.productId, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true },
      );
      if (result && typeof result.stockQuantity === "number" && result.stockQuantity <= 0) {
        await ProductModel.findByIdAndUpdate(item.productId, { inStock: false });
      }
    }),
  );
}

/**
 * Restores stock on order cancellation.
 * For variant items: increments variant stockQuantity and sets variant inStock=true.
 * For product-level items: increments product stockQuantity.
 */
export async function restoreStock(items: StockItem[]): Promise<void> {
  await connectDB();

  await Promise.all(
    items.map((item) => {
      if (item.variantId) {
        const variantObjId = new mongoose.Types.ObjectId(item.variantId);
        return ProductModel.findOneAndUpdate(
          { _id: item.productId, variants: { $elemMatch: { _id: variantObjId, stockQuantity: { $ne: null } } } },
          { $inc: { "variants.$.stockQuantity": item.quantity }, $set: { "variants.$.inStock": true } },
        );
      }
      return ProductModel.findOneAndUpdate(
        { _id: item.productId, stockQuantity: { $ne: null } },
        { $inc: { stockQuantity: item.quantity }, inStock: true },
      );
    }),
  );
}
