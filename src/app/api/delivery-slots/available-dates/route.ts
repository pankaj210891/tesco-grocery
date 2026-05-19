import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import DeliverySlotModel from "@/lib/db/models/delivery-slot.model";

interface DateAvailability {
  date:           string;
  hasAvailability: boolean;
  totalAvailable: number;
}

/**
 * GET /api/delivery-slots/available-dates
 *
 * Returns the next 7 calendar days with slot availability summary.
 * Used by the checkout slot picker to highlight bookable dates.
 */
export async function GET() {
  try {
    await connectDB();
    const now = new Date();

    // Build next 7 dates starting tomorrow
    const dates: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const slots = await DeliverySlotModel
      .find({ date: { $in: dates }, isActive: true, cutoffTime: { $gt: now } })
      .select("date capacity bookedCount")
      .lean();

    const availability: DateAvailability[] = dates.map((date) => {
      const daySlots = slots.filter((s) => s.date === date);
      const totalAvailable = daySlots.reduce(
        (sum, s) => sum + Math.max(0, s.capacity - s.bookedCount),
        0,
      );
      return { date, hasAvailability: totalAvailable > 0, totalAvailable };
    });

    return NextResponse.json({ success: true, data: availability });
  } catch (err) {
    console.error("[GET /api/delivery-slots/available-dates]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch dates" }, { status: 500 });
  }
}
