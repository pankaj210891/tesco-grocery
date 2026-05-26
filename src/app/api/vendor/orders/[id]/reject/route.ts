import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireVendor } from "@/lib/utils/apiAuth";
import { rejectVendorOrder } from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";
import { enqueueRestoreStock } from "@/lib/queue/jobs/stock.jobs";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import { emitAfterVendorStatusChange } from "@/lib/sse/emitter";

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
    // Read items before rejecting so we can restore stock
    await connectDB();
    const vendorOrder = await VendorOrderModel
      .findOne({
        _id:      new mongoose.Types.ObjectId(id),
        vendorId: new mongoose.Types.ObjectId(auth.vendorId),
        status:   "PENDING",
      })
      .lean<{ items: Array<{ productId: string; variantId?: string | null; quantity: number }> }>();

    if (!vendorOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found, access denied, or not in PENDING status" },
        { status: 404 },
      );
    }

    const updated = await rejectVendorOrder(id, auth.vendorId, parsed.data.reason, auth.userId);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Failed to reject order" }, { status: 400 });
    }

    // Restore stock for rejected items via durable queue
    void enqueueRestoreStock(
      vendorOrder.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    );

    await syncParentOrderStatus(updated.parentOrderId);

    void emitAfterVendorStatusChange(
      updated._id,
      updated.parentOrderNumber,
      auth.vendorId,
      updated.status,
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject order";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
