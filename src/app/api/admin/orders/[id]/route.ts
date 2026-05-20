import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import UserModel from "@/lib/db/models/user.model";
import { sendOrderStatus } from "@/services/email.service";
import { getVendorOrdersByParentOrder } from "@/services/vendor-order.service";
import type { ParentOrderStatus } from "@/types";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES: ParentOrderStatus[] = [
  "pending",
  "partially_confirmed",
  "processing",
  "partially_delivered",
  "completed",
  "shipped",
  "delivered",
  "partially_cancelled",
  "cancelled",
];

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

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const { status } = await req.json() as { status: string };

    if (!VALID_STATUSES.includes(status as ParentOrderStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` },
        { status: 422 },
      );
    }

    const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    if (order.delivery?.email) {
      try {
        await sendOrderStatus(order.delivery.email, {
          orderNumber:  order.orderNumber,
          customerName: order.delivery.fullName,
          newStatus:    status,
          total:        order.total,
        });
      } catch (emailErr) {
        console.error("[orders] Failed to send status email:", emailErr);
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    console.error("[orders] Failed to update order status:", err);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
