import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";

const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status = searchParams.get("status") ?? "";

    // Validate vendorId before using in query to prevent injection
    if (!mongoose.isValidObjectId(auth.vendorId)) {
      return NextResponse.json({ success: false, error: "Invalid vendor" }, { status: 400 });
    }

    const filter: Record<string, unknown> = {
      "items.vendorId": new mongoose.Types.ObjectId(auth.vendorId),
    };
    if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);

    // Strip other vendors' items from each order (data isolation)
    const vendorId = auth.vendorId;
    const filtered = orders.map((order) => ({
      ...order,
      items: order.items.filter(
        (item) => item.vendorId?.toString() === vendorId,
      ),
    }));

    return NextResponse.json({
      success: true,
      data: { orders: filtered, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
