import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit    = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status   = searchParams.get("status")   ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo   = searchParams.get("dateTo")   ?? "";
    const q        = searchParams.get("q")        ?? "";
    const userId   = searchParams.get("userId")   ?? "";
    const vendorId = searchParams.get("vendorId") ?? "";

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") filter.status = status;

    if (q) {
      filter.$or = [
        { orderNumber:        { $regex: q, $options: "i" } },
        { "delivery.fullName": { $regex: q, $options: "i" } },
        { "delivery.email":   { $regex: q, $options: "i" } },
      ];
    }

    if (userId && mongoose.isValidObjectId(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (vendorId && mongoose.isValidObjectId(vendorId)) {
      filter["items.vendorId"] = new mongoose.Types.ObjectId(vendorId);
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
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
