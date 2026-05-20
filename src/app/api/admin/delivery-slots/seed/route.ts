import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import DeliverySlotModel, { SLOT_WINDOWS } from "@/lib/db/models/delivery-slot.model";

/**
 * POST /api/admin/delivery-slots/seed?force=true
 *
 * Seeds the next 14 days with all 4 time windows at 50 capacity each.
 * Cutoff = 06:00 UTC on the delivery day.
 * By default idempotent — skips existing slots.
 * Pass ?force=true to delete all future slots and recreate them.
 */
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();

    const force = new URL(req.url).searchParams.get("force") === "true";
    const today = new Date().toISOString().slice(0, 10);

    const dates: string[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    if (force) {
      await DeliverySlotModel.deleteMany({ date: { $gte: today } });
    }

    const docs = dates.flatMap((date) =>
      SLOT_WINDOWS.map((window) => ({
        date,
        window,
        capacity:    50,
        bookedCount: 0,
        cutoffTime:  new Date(`${date}T06:00:00.000Z`),
        isActive:    true,
      })),
    );

    let created = 0;
    let skipped = 0;
    for (const doc of docs) {
      try {
        await DeliverySlotModel.create(doc);
        created++;
      } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
          skipped++;
          continue;
        }
        throw err;
      }
    }

    const message = created > 0
      ? `Seeded ${created} slots across ${dates.length} days`
      : `All ${skipped} slots already exist — nothing to seed. Use "Force Reseed" to recreate.`;

    return NextResponse.json({ success: true, created, skipped, message });
  } catch (err) {
    console.error("[POST /api/admin/delivery-slots/seed]", err);
    return NextResponse.json({ success: false, error: "Seed failed" }, { status: 500 });
  }
}
