import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import { sendOrderStatus } from "@/services/email.service";

type Params = { params: Promise<{ id: string }> };

// Vendors may only advance shipment status — not cancel or regress orders.
const VENDOR_ALLOWED_STATUSES = ["processing", "shipped", "delivered"] as const;
type VendorStatus = typeof VENDOR_ALLOWED_STATUSES[number];

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid order ID" }, { status: 400 });
    }

    const { status } = await req.json() as { status: string };

    if (!VENDOR_ALLOWED_STATUSES.includes(status as VendorStatus)) {
      return NextResponse.json(
        { success: false, error: `Vendors may only set status to: ${VENDOR_ALLOWED_STATUSES.join(", ")}` },
        { status: 422 },
      );
    }

    // Verify this order actually contains items from this vendor (IDOR prevention)
    const order = await OrderModel.findOne({
      _id:              id,
      "items.vendorId": new mongoose.Types.ObjectId(auth.vendorId),
    }).lean();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found or access denied" }, { status: 404 });
    }

    const updated = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (updated.delivery?.email) {
      try {
        await sendOrderStatus(updated.delivery.email, {
          orderNumber:  updated.orderNumber,
          customerName: updated.delivery.fullName,
          newStatus:    status,
          total:        updated.total,
        });
      } catch {
        // Email failure is non-critical
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
