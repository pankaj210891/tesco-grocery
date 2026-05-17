import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import UserModel from "@/lib/db/models/user.model";
import { sendOrderStatus } from "@/services/email.service";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

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

    return NextResponse.json({ success: true, data: { ...order, user } });
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

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 422 });
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
        console.log("[orders] Status email sent to", order.delivery.email);
      } catch (emailErr) {
        console.error("[orders] Failed to send status email:", emailErr);
      }
    } else {
      console.warn("[orders] No delivery email on order", order.orderNumber);
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    console.error("[orders] Failed to update order status:", err);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
