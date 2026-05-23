import { z } from "zod";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { getOrderByNumber } from "@/services/order.service";
import { connectDB } from "@/lib/db/mongoose";
import OrderModel from "@/lib/db/models/order.model";

const bodySchema = z.object({
  reason:      z.string().min(5).max(300),
  vendorOrderId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        name:      z.string(),
        quantity:  z.number().int().positive(),
        amount:    z.number().positive(),
      }),
    )
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { orderNumber } = await params;

  const body   = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  try {
    const order = await getOrderByNumber(orderNumber, authUser.userId);
    if (!order) {
      return Response.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Only delivered orders or partially delivered orders can request refunds
    const refundableStatuses: typeof order.status[] = ["delivered", "completed", "partially_delivered"];
    if (!refundableStatuses.includes(order.status)) {
      return Response.json(
        { success: false, error: "Refunds can only be requested for delivered orders" },
        { status: 422 },
      );
    }

    if (order.paymentStatus === "refunded") {
      return Response.json(
        { success: false, error: "This order has already been fully refunded" },
        { status: 422 },
      );
    }

    // Compute the total refund amount for admin reference
    const refundAmount = parsed.data.items?.length
      ? parsed.data.items.reduce((sum, i) => sum + i.amount * i.quantity, 0)
      : order.total;

    // Record the refund request on the order (admin will process the actual Razorpay refund)
    await connectDB();
    const updateOp: Record<string, unknown> = {
      $set: {
        refundReason:  parsed.data.reason,
        refundStatus:  "initiated",
        refundType:    parsed.data.items?.length ? "partial" : "full",
        refundAmount,
      },
    };
    if (parsed.data.items?.length) {
      (updateOp as { $push?: unknown })["$push"] = {
        refundedItems: { $each: parsed.data.items },
      };
    }
    await OrderModel.findOneAndUpdate(
      { orderNumber, userId: authUser.userId },
      updateOp,
    );

    return Response.json({
      success: true,
      data:    { message: "Refund request submitted. Our team will process it within 2–3 business days." },
    });
  } catch (err) {
    console.error("[POST /api/account/orders/[orderNumber]/refund]", err);
    return Response.json({ success: false, error: "Failed to submit refund request" }, { status: 500 });
  }
}
