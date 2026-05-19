import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import DeliverySlotModel from "@/lib/db/models/delivery-slot.model";
import type { DeliverySlot } from "@/types";

/**
 * GET /api/delivery-slots?date=YYYY-MM-DD
 *
 * Returns available delivery slots for a given date.
 * A slot is available when: isActive && cutoffTime > now && bookedCount < capacity.
 */
export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, error: "Valid date param (YYYY-MM-DD) required" }, { status: 400 });
  }

  try {
    await connectDB();
    const now   = new Date();

    const docs = await DeliverySlotModel
      .find({ date, isActive: true, cutoffTime: { $gt: now } })
      .sort({ window: 1 })
      .lean();

    const slots: DeliverySlot[] = docs.map((d) => ({
      _id:         d._id.toString(),
      date:        d.date,
      window:      d.window as DeliverySlot["window"],
      capacity:    d.capacity,
      bookedCount: d.bookedCount,
      cutoffTime:  d.cutoffTime instanceof Date ? d.cutoffTime.toISOString() : String(d.cutoffTime),
      isActive:    d.isActive,
      available:   Math.max(0, d.capacity - d.bookedCount),
      createdAt:   d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    }));

    return NextResponse.json({ success: true, data: slots });
  } catch (err) {
    console.error("[GET /api/delivery-slots]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch slots" }, { status: 500 });
  }
}
