import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import ProductModel from "@/lib/db/models/product.model";
import CartModel from "@/lib/db/models/cart.model";

type Params = { params: Promise<{ orderNumber: string }> };

export interface ReorderResult {
  added:       { productId: string; name: string; quantity: number }[];
  unavailable: { name: string; reason: string }[];
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { orderNumber } = await params;

    const order = await OrderModel.findOne({
      orderNumber,
      userId: auth.userId,
    }).lean();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const items = (order.items ?? []) as Array<{
      productId?: string | null;
      name: string;
      quantity: number;
    }>;

    if (!items.length) {
      return NextResponse.json({ success: false, error: "Order has no items" }, { status: 400 });
    }

    const productIds = items
      .map((i) => i.productId)
      .filter((id): id is string => !!id);

    const products = await ProductModel
      .find({ _id: { $in: productIds } })
      .select("_id inStock name stockQuantity")
      .lean<{ _id: { toString(): string }; inStock: boolean; name: string; stockQuantity?: number }[]>();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const added:       ReorderResult["added"]       = [];
    const unavailable: ReorderResult["unavailable"] = [];

    for (const item of items) {
      if (!item.productId) {
        unavailable.push({ name: item.name, reason: "Product no longer available" });
        continue;
      }

      const product = productMap.get(item.productId);

      if (!product) {
        unavailable.push({ name: item.name, reason: "Product no longer available" });
        continue;
      }

      if (!product.inStock) {
        unavailable.push({ name: item.name, reason: "Currently out of stock" });
        continue;
      }

      // Guard against overselling when stockQuantity is tracked
      if (typeof product.stockQuantity === "number" && product.stockQuantity < 1) {
        unavailable.push({ name: item.name, reason: "Currently out of stock" });
        continue;
      }

      const qty = item.quantity;

      // Upsert into cart: update if already present, push if new
      const updated = await CartModel.findOneAndUpdate(
        { userId: auth.userId, "items.productId": item.productId },
        { $inc: { "items.$.quantity": qty } },
        { new: true },
      );

      if (!updated) {
        await CartModel.findOneAndUpdate(
          { userId: auth.userId },
          { $push: { items: { productId: item.productId, quantity: qty } } },
          { upsert: true, new: true },
        );
      }

      added.push({ productId: item.productId, name: item.name, quantity: qty });
    }

    return NextResponse.json({
      success: true,
      data: { added, unavailable } satisfies ReorderResult,
    });
  } catch (err) {
    console.error("[POST /api/account/orders/[orderNumber]/reorder]", err);
    return NextResponse.json({ success: false, error: "Failed to reorder" }, { status: 500 });
  }
}
