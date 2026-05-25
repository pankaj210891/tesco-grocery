import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import { VENDOR_ORDER_STATUSES, type VendorOrderStatus } from "@/lib/db/models/vendor-order.model";
import { decodeCursor, findKeyset, COMMON_SORT_CONFIGS } from "@/lib/pagination/keyset";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit    = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const rawCursor = searchParams.get("cursor") ?? "";
    const vendorId = searchParams.get("vendorId") ?? "";
    const status   = searchParams.get("status")   ?? "";
    const parentId = searchParams.get("parentOrderId") ?? "";

    const filter: Record<string, unknown> = {};

    if (vendorId && mongoose.isValidObjectId(vendorId)) {
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }
    if (status && VENDOR_ORDER_STATUSES.includes(status as VendorOrderStatus)) {
      filter.status = status;
    }
    if (parentId && mongoose.isValidObjectId(parentId)) {
      filter.parentOrderId = new mongoose.Types.ObjectId(parentId);
    }

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj) {
      const { docs, nextCursor, hasMore } = await findKeyset({
        model:  VendorOrderModel,
        filter,
        cursor: cursorObj,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: { data: docs, nextCursor, hasMore },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      VendorOrderModel.find(filter)
        .sort(COMMON_SORT_CONFIGS.newest.sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      VendorOrderModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { data: docs, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch vendor orders" }, { status: 500 });
  }
}
