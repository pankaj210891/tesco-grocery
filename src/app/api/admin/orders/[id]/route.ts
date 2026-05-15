import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import { sendOrderStatus } from "@/services/email.service";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

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
      sendOrderStatus(order.delivery.email, {
        orderNumber:  order.orderNumber,
        customerName: order.delivery.fullName,
        newStatus:    status,
        total:        order.total,
      });
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
