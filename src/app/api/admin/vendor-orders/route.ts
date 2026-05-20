import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import { VENDOR_ORDER_STATUSES, type VendorOrderStatus } from "@/lib/db/models/vendor-order.model";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit    = Math.min(100, Number(searchParams.get("limit") ?? 20));
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

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      VendorOrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
