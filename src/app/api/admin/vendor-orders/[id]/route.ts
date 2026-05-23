import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { adminUpdateVendorOrderStatus } from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import { ALL_VENDOR_ORDER_STATUSES, type VendorOrderStatus } from "@/constants/order-status";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  // Admin has access to all statuses including terminal overrides
  status: z.enum(ALL_VENDOR_ORDER_STATUSES),
  note:   z.string().max(300).optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await VendorOrderModel.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Vendor order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: doc });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch vendor order" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
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
    const updated = await adminUpdateVendorOrderStatus(
      id,
      parsed.data.status as VendorOrderStatus,
      auth.userId,
      parsed.data.note,
    );
    if (!updated) {
      return NextResponse.json({ success: false, error: "Vendor order not found" }, { status: 404 });
    }

    await syncParentOrderStatus(updated.parentOrderId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update vendor order";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
