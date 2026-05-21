import { z } from "zod";
import Razorpay from "razorpay";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { cancelOrder, setOrderRefund, CANCELLABLE_STATUSES } from "@/services/order.service";
import { releaseDeliverySlot } from "@/services/delivery-slot.service";
import { restoreStock } from "@/services/inventory.service";
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

  // ── Release delivery slot if one was booked ──────────────────────────────
  if (order.deliverySlotId) {
    await releaseDeliverySlot(order.deliverySlotId).catch((e) => {
      console.error("[cancel] Failed to release delivery slot:", e);
    });
  }

  // ── Restore stock for cancelled items ─────────────────────────────────────
  await restoreStock(
    order.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
  ).catch((e) => {
    console.error("[cancel] Failed to restore stock:", e);
  });

  // ── Initiate Razorpay refund if applicable ────────────────────────────────
  let refundInitiated = false;
  let refundError: string | undefined;

  if (order.paymentMethod === "razorpay" && order.paymentStatus === "paid" && order.razorpayPaymentId) {
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      refundError = "Razorpay credentials not configured in environment.";
      console.error("[cancel] Razorpay refund skipped: missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
    } else {
      try {
        const razorpay   = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const amountPaise = Math.round(order.total * 100);

        // Capture the payment first — required before refunding.
        // Payments created without payment_capture:1 are in "authorized" state.
        // If already captured this throws; we ignore that specific error.
        try {
          await razorpay.payments.capture(order.razorpayPaymentId, amountPaise, "INR");
          console.log("[cancel] Payment captured before refund:", order.razorpayPaymentId);
        } catch (captureErr) {
          const capObj = captureErr as { error?: { code?: string; description?: string } };
          // "BAD_REQUEST_ERROR" with "already captured" description is fine — proceed to refund
          console.log("[cancel] Capture step:", capObj?.error?.description ?? JSON.stringify(captureErr));
        }

        const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
          amount: amountPaise,
        });

        await setOrderRefund(orderNumber, refund.id, "initiated");
        refundInitiated = true;
        console.log("[cancel] Razorpay refund initiated:", refund.id, "for payment:", order.razorpayPaymentId);
      } catch (refundErr) {
        const errObj = refundErr as { error?: { description?: string; code?: string }; statusCode?: number };
        refundError = errObj?.error?.description
          ?? errObj?.error?.code
          ?? (refundErr instanceof Error ? refundErr.message : JSON.stringify(refundErr));
        console.error("[cancel] Razorpay refund initiation failed:", JSON.stringify(refundErr));
      }
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

  return Response.json({ success: true, data: order, refundInitiated, refundError });
}
