import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import {
  getVendorOrderById,
  updateVendorOrderStatus,
  VENDOR_TRANSITIONS,
} from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";
import { enqueueConfirmEarnings } from "@/lib/queue/jobs/payout.jobs";
import { enqueueOrderStatus } from "@/lib/queue/jobs/email.jobs";
import { connectDB } from "@/lib/db/mongoose";
import OrderModel from "@/lib/db/models/order.model";
import type { VendorOrderStatus } from "@/lib/db/models/vendor-order.model";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  try {
    const vendorOrder = await getVendorOrderById(id, auth.vendorId);
    if (!vendorOrder) {
      return NextResponse.json({ success: false, error: "Order not found or access denied" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: vendorOrder });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  try {
    const body: { status?: string; note?: string; trackingNumber?: string } = await req.json();
    const { status, note, trackingNumber } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "status is required" }, { status: 422 });
    }

    // Validate the requested status is a known vendor status
    const allowedKeys = Object.keys(VENDOR_TRANSITIONS) as VendorOrderStatus[];
    if (!allowedKeys.includes(status as VendorOrderStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}. Allowed: ${allowedKeys.join(", ")}` },
        { status: 422 },
      );
    }

    const updated = await updateVendorOrderStatus(id, auth.vendorId, status as VendorOrderStatus, auth.userId, note);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Order not found or access denied" }, { status: 404 });
    }

    // Optionally persist tracking number on OUT_FOR_DELIVERY
    if (trackingNumber && status === "OUT_FOR_DELIVERY") {
      const { connectDB: _cd } = await import("@/lib/db/mongoose");
      await _cd();
      const VendorOrderModel = (await import("@/lib/db/models/vendor-order.model")).default;
      await VendorOrderModel.findByIdAndUpdate(id, { trackingNumber });
    }

    // Sync parent order status after every sub-order status change
    await syncParentOrderStatus(updated.parentOrderId);

    // When delivered, confirm this vendor's earning via durable queue
    if (status === "DELIVERED") {
      void enqueueConfirmEarnings(updated.parentOrderId, auth.vendorId);
    }

    // Notify customer of this vendor's delivery status change via durable queue
    void (async () => {
      try {
        await connectDB();
        const parentOrder = await OrderModel
          .findById(updated.parentOrderId)
          .select("delivery orderNumber total")
          .lean<{ delivery: { email: string; fullName: string }; orderNumber: string; total: number }>();

        if (parentOrder?.delivery?.email) {
          void enqueueOrderStatus(parentOrder.delivery.email, {
            orderNumber:  parentOrder.orderNumber,
            customerName: parentOrder.delivery.fullName,
            newStatus:    `${updated.vendorName}: ${status}`,
            total:        parentOrder.total,
          });
        }
      } catch {
        // DB fetch is non-critical — email will be skipped rather than crashing the response
      }
    })();

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
