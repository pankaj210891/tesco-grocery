import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import { updateVendorOrderStatus } from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";
import { VENDOR_OP_STATUSES } from "@/constants/order-status";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  // Vendors may set operational statuses including DELIVERED (delivery confirmation).
  // Admin-exclusive statuses (CANCELLED, RETURNED, REFUNDED, FAILED) are blocked here.
  status: z.enum(VENDOR_OP_STATUSES),
  note:   z.string().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  try {
    const updated = await updateVendorOrderStatus(
      id,
      auth.vendorId,
      parsed.data.status,
      auth.userId,
      parsed.data.note,
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Order not found or you do not have access to it" },
        { status: 404 },
      );
    }

    // Propagate the new vendor sub-order status to the parent order
    await syncParentOrderStatus(updated.parentOrderId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order status";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
