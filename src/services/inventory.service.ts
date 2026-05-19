import { connectDB } from "@/lib/db/mongoose";
import ProductModel from "@/lib/db/models/product.model";

export interface StockItem {
  productId: string;
  quantity:  number;
}

export interface StockCheckResult {
  ok:          boolean;
  unavailable: { productId: string; name: string; available: number; requested: number }[];
}

/**
 * Checks whether all requested quantities can be fulfilled.
 * Only products with tracked stockQuantity (not null) are checked.
 */
export async function checkStock(items: StockItem[]): Promise<StockCheckResult> {
  await connectDB();

  const ids = items.map((i) => i.productId);
  const products = await ProductModel
    .find({ _id: { $in: ids } })
    .select("_id name inStock stockQuantity")
    .lean<{ _id: { toString(): string }; name: string; inStock: boolean; stockQuantity?: number | null }[]>();

  const unavailable: StockCheckResult["unavailable"] = [];

  for (const item of items) {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product) { unavailable.push({ productId: item.productId, name: "Unknown product", available: 0, requested: item.quantity }); continue; }
    if (!product.inStock) { unavailable.push({ productId: item.productId, name: product.name, available: 0, requested: item.quantity }); continue; }
    if (typeof product.stockQuantity === "number" && product.stockQuantity < item.quantity) {
      unavailable.push({ productId: item.productId, name: product.name, available: product.stockQuantity, requested: item.quantity });
    }
  }

  return { ok: unavailable.length === 0, unavailable };
}

/**
 * Atomically decrements stockQuantity for each item.
 * Called after order creation.
 * Products with null stockQuantity (untracked) are skipped.
 * Also sets inStock=false when stockQuantity reaches 0.
 */
export async function decrementStock(items: StockItem[]): Promise<void> {
  await connectDB();

  await Promise.all(
    items.map(async (item) => {
      const result = await ProductModel.findOneAndUpdate(
        {
          _id:          item.productId,
          stockQuantity: { $gte: item.quantity },
        },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true },
      );

      // Mark out-of-stock when quantity reaches 0
      if (result && typeof result.stockQuantity === "number" && result.stockQuantity <= 0) {
        await ProductModel.findByIdAndUpdate(item.productId, { inStock: false });
      }
    }),
  );
}

/**
 * Restores stock on order cancellation.
 * Only affects products with tracked stockQuantity.
 */
export async function restoreStock(items: StockItem[]): Promise<void> {
  await connectDB();

  await Promise.all(
    items.map((item) =>
      ProductModel.findOneAndUpdate(
        { _id: item.productId, stockQuantity: { $ne: null } },
        { $inc: { stockQuantity: item.quantity }, inStock: true },
      ),
    ),
  );
}
