import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import { AdminRefundSchema } from "@/lib/validations/admin-filters";
import { formatPrice } from "@/lib/utils/format";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid order ID" }, { status: 400 });
    }

    const raw = await req.json() as unknown;
    const parsed = AdminRefundSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 422 },
      );
    }

    const order = await OrderModel.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Fully refunded orders cannot be refunded again
    if (order.paymentStatus === "refunded") {
      return NextResponse.json(
        { success: false, error: "Order has already been fully refunded" },
        { status: 422 },
      );
    }

    // Only paid orders are refundable
    if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") {
      return NextResponse.json(
        { success: false, error: "Only paid orders can be refunded" },
        { status: 422 },
      );
    }

    const alreadyRefunded = (order.refundedAmount as number) ?? 0;
    const maxRefundable   = order.total - alreadyRefunded;

    if (maxRefundable <= 0) {
      return NextResponse.json(
        { success: false, error: "No refundable amount remaining" },
        { status: 422 },
      );
    }

    const { type, reason, items, amount } = parsed.data;

    // Verify each refund item actually exists in the order (ownership check)
    if (items && items.length > 0) {
      type OrderItem = { productId: string; price: number; quantity: number };
      const orderItemsMap = new Map(
        (order.items as OrderItem[]).map((i) => [i.productId, i]),
      );

      for (const refundItem of items) {
        const orderItem = orderItemsMap.get(refundItem.productId);
        if (!orderItem) {
          return NextResponse.json(
            { success: false, error: `Product ${refundItem.productId} is not part of this order` },
            { status: 422 },
          );
        }
        const maxItemRefund = orderItem.price * orderItem.quantity;
        if (refundItem.amount > maxItemRefund) {
          return NextResponse.json(
            {
              success: false,
              error: `Refund amount for product ${refundItem.productId} exceeds item total of ${formatPrice(maxItemRefund)}`,
            },
            { status: 422 },
          );
        }
      }
    }

    // Compute the refund amount for this request
    let refundAmount: number;

    if (type === "full") {
      refundAmount = maxRefundable;
    } else {
      if (items && items.length > 0) {
        refundAmount = items.reduce((sum, item) => sum + item.amount, 0);
      } else if (amount !== undefined) {
        refundAmount = amount;
      } else {
        return NextResponse.json(
          { success: false, error: "Partial refund requires items or an explicit amount" },
          { status: 422 },
        );
      }
    }

    if (refundAmount <= 0) {
      return NextResponse.json({ success: false, error: "Refund amount must be greater than 0" }, { status: 422 });
    }

    if (refundAmount > maxRefundable) {
      return NextResponse.json(
        { success: false, error: `Refund amount exceeds refundable balance of ${formatPrice(maxRefundable)}` },
        { status: 422 },
      );
    }

    const newRefundedAmount = alreadyRefunded + refundAmount;
    const isFullyRefunded   = newRefundedAmount >= order.total;

    const updatePayload: Record<string, unknown> = {
      refundType:        type,
      refundReason:      reason,
      refundedAmount:    newRefundedAmount,
      refundStatus:      "initiated",
      paymentStatus:     isFullyRefunded ? "refunded" : "partially_refunded",
      refundProcessedAt: new Date(),
    };

    if (items && items.length > 0) {
      const existingItems = (order.refundedItems as Array<{ productId: string; name: string; quantity: number; amount: number }>) ?? [];
      updatePayload.refundedItems = [...existingItems, ...items];
    }

    const updated = await OrderModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true },
    );

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to process refund" }, { status: 500 });
  }
}
