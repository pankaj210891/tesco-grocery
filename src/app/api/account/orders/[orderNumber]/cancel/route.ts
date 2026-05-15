import { z } from "zod";
import Razorpay from "razorpay";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { cancelOrder, setOrderRefund, CANCELLABLE_STATUSES } from "@/services/order.service";
import { sendOrderCancellation } from "@/services/email.service";

const bodySchema = z.object({
  reason:  z.string().max(200).optional(),
  comment: z.string().max(500).optional(),
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

  const { reason, comment } = parsed.data;

  const order = await cancelOrder(orderNumber, authUser.userId, reason, comment);

  if (!order) {
    return Response.json(
      {
        success: false,
        error: `Order not found or cannot be cancelled. Only ${CANCELLABLE_STATUSES.join(" or ")} orders can be cancelled.`,
      },
      { status: 422 },
    );
  }

  // ── Initiate Razorpay refund if applicable ────────────────────────────────
  if (order.paymentMethod === "razorpay" && order.paymentStatus === "paid" && order.razorpayPaymentId) {
    try {
      const razorpay = new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: Math.round(order.total * 100),
      });

      await setOrderRefund(orderNumber, refund.id, "initiated");
    } catch (refundErr) {
      console.error("[cancel] Razorpay refund initiation failed:", refundErr);
    }
  }

  // ── Send cancellation email ───────────────────────────────────────────────
  try {
    await sendOrderCancellation(order.delivery.email, {
      orderNumber:  order.orderNumber,
      customerName: order.delivery.fullName,
      total:        order.total,
      reason,
      comment,
      isRefundable: order.paymentMethod === "razorpay" && order.paymentStatus === "paid",
    });
    console.log("[cancel] Cancellation email sent to", order.delivery.email);
  } catch (emailErr) {
    console.error("[cancel] Failed to send cancellation email:", emailErr);
  }

  return Response.json({ success: true, data: order });
}
