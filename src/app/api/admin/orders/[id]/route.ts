import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import UserModel from "@/lib/db/models/user.model";
import { getVendorOrdersByParentOrder } from "@/services/vendor-order.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid order ID" }, { status: 400 });
    }

    const order = await OrderModel.findById(id).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    let user = null;
    if (order.userId && mongoose.isValidObjectId(order.userId)) {
      user = await UserModel.findById(order.userId)
        .select("_id name email role status")
        .lean();
    }

    // Include vendor sub-orders for admin visibility
    const vendorOrders = await getVendorOrdersByParentOrder(id);

    return NextResponse.json({ success: true, data: { ...order, user, vendorOrders } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
  }
}
