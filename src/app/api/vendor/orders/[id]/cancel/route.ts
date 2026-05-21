import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireVendor } from "@/lib/utils/apiAuth";
import { cancelVendorOrder } from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";
import { restoreStock } from "@/services/inventory.service";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";

const bodySchema = z.object({
  reason: z.string().min(5).max(300),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 },
    );
  }

  try {
    // Read items before cancelling so we can restore stock
    await connectDB();
    const vendorOrder = await VendorOrderModel
      .findOne({
        _id:      new mongoose.Types.ObjectId(id),
        vendorId: new mongoose.Types.ObjectId(auth.vendorId),
        status:   "PENDING",
      })
      .lean<{ items: Array<{ productId: string; quantity: number }> }>();

    if (!vendorOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found, access denied, or order has already been accepted and cannot be cancelled" },
        { status: 404 },
      );
    }

    const updated = await cancelVendorOrder(id, auth.vendorId, parsed.data.reason, auth.userId);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Failed to cancel order" }, { status: 400 });
    }

    // Restore stock for cancelled items
    void restoreStock(
      vendorOrder.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );

    await syncParentOrderStatus(updated.parentOrderId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel order";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
