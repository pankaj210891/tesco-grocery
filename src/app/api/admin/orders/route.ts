import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import { AdminOrderQuerySchema } from "@/lib/validations/admin-filters";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = AdminOrderQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { page, limit, status, q, vendorId, dateFrom, dateTo } = parsed.data;

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;

    if (q) {
      filter.$or = [
        { orderNumber:         { $regex: q, $options: "i" } },
        { "delivery.fullName": { $regex: q, $options: "i" } },
        { "delivery.email":    { $regex: q, $options: "i" } },
      ];
    }

    if (vendorId && mongoose.isValidObjectId(vendorId)) {
      filter["items.vendorId"] = new mongoose.Types.ObjectId(vendorId);
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59.999Z`);
        dateFilter.$lte = end;
      }
      filter.createdAt = dateFilter;
    }

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { orders, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
