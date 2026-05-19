import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import DeliverySlotModel from "@/lib/db/models/delivery-slot.model";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  capacity: z.number().int().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

function requireAdmin(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "admin") return null;
  return auth;
}

// PATCH /api/admin/delivery-slots/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const body   = await req.json();

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 });
    }

    const slot = await DeliverySlotModel.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
    if (!slot) {
      return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: slot });
  } catch (err) {
    console.error("[PATCH /api/admin/delivery-slots/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to update slot" }, { status: 500 });
  }
}

// DELETE /api/admin/delivery-slots/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await params;

    const slot = await DeliverySlotModel.findById(id).lean();
    if (!slot) {
      return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 });
    }
    if (slot.bookedCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a slot that has bookings. Deactivate it instead." },
        { status: 409 },
      );
    }

    await DeliverySlotModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Slot deleted" });
  } catch (err) {
    console.error("[DELETE /api/admin/delivery-slots/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to delete slot" }, { status: 500 });
  }
}
