import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import DeliverySlotModel, { SLOT_WINDOWS } from "@/lib/db/models/delivery-slot.model";
import { z } from "zod";

const CreateSlotSchema = z.object({
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  window:     z.enum(SLOT_WINDOWS),
  capacity:   z.number().int().min(1).max(500),
  cutoffTime: z.string().datetime(),
  isActive:   z.boolean().optional().default(true),
});

const BulkCreateSchema = z.object({
  dates:      z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  windows:    z.array(z.enum(SLOT_WINDOWS)).min(1),
  capacity:   z.number().int().min(1).max(500),
  cutoffHour: z.number().int().min(0).max(23).default(6), // hour on the delivery day (e.g. 06:00 = 6am cutoff)
});

function requireAdmin(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "admin") return null;
  return auth;
}

// GET /api/admin/delivery-slots?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const date = new URL(req.url).searchParams.get("date");

  try {
    await connectDB();

    const query = date ? { date } : {};
    const slots = await DeliverySlotModel
      .find(query)
      .sort({ date: 1, window: 1 })
      .lean();

    return NextResponse.json({ success: true, data: slots });
  } catch (err) {
    console.error("[GET /api/admin/delivery-slots]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch slots" }, { status: 500 });
  }
}

// POST /api/admin/delivery-slots  — single slot or bulk create
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await req.json();

    // Bulk mode when `dates` array is provided
    if ("dates" in body) {
      const parsed = BulkCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 });
      }
      const { dates, windows, capacity, cutoffHour } = parsed.data;

      const docs = dates.flatMap((date) =>
        windows.map((window) => {
          const cutoff = new Date(`${date}T${String(cutoffHour).padStart(2, "0")}:00:00.000Z`);
          return { date, window, capacity, cutoffTime: cutoff, isActive: true };
        }),
      );

      // insertMany with ordered:false so duplicates are skipped silently
      const result = await DeliverySlotModel.insertMany(docs, {
        ordered: false,
      }).catch((err: { writeErrors?: unknown[] }) => {
        if (err.writeErrors) return { length: docs.length - err.writeErrors.length };
        throw err;
      });

      return NextResponse.json({
        success:  true,
        message:  `Created ${(result as { length: number }).length} slot(s)`,
      }, { status: 201 });
    }

    // Single slot
    const parsed = CreateSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 });
    }

    const slot = await DeliverySlotModel.create(parsed.data);
    return NextResponse.json({ success: true, data: slot }, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({ success: false, error: "Slot already exists for this date and window" }, { status: 409 });
    }
    console.error("[POST /api/admin/delivery-slots]", err);
    return NextResponse.json({ success: false, error: "Failed to create slot" }, { status: 500 });
  }
}
