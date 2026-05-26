import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import { AdminOrderQuerySchema } from "@/lib/validations/admin-filters";
import { decodeCursor, findKeyset, COMMON_SORT_CONFIGS } from "@/lib/pagination/keyset";

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

  const { page, limit, cursor: rawCursor, status, q, vendorId, dateFrom, dateTo } = parsed.data;

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
      if (dateTo)   dateFilter.$lte = new Date(`${dateTo}T23:59:59.999Z`);
      filter.createdAt = dateFilter;
    }

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj) {
      const { docs, nextCursor, hasMore } = await findKeyset({
        model:  OrderModel,
        filter,
        cursor: cursorObj,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: { orders: docs, nextCursor, hasMore },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const sort = COMMON_SORT_CONFIGS.newest.sort;

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .sort(sort)
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
