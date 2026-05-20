import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import { acceptVendorOrder } from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  try {
    const updated = await acceptVendorOrder(id, auth.vendorId);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Order not found, access denied, or not in PENDING status" },
        { status: 404 },
      );
    }

    await syncParentOrderStatus(updated.parentOrderId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to accept order";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
