import crypto from "crypto";
import { getOrderByRefundId, setOrderRefund } from "@/services/order.service";
import { sendRefundConfirmed } from "@/services/email.service";

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] RAZORPAY_WEBHOOK_SECRET is not set");
    return Response.json({ success: false }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    return Response.json({ success: false, error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { refund?: { entity?: { id?: string; amount?: number } } };
  };

  if (event.event === "refund.processed") {
    const refundId = event.payload?.refund?.entity?.id;
    if (!refundId) {
      return Response.json({ success: true });
    }

    try {
      await setOrderRefund(refundId, refundId, "processed");

      const order = await getOrderByRefundId(refundId);
      if (order) {
        try {
          await sendRefundConfirmed(order.delivery.email, {
            orderNumber:  order.orderNumber,
            customerName: order.delivery.fullName,
            total:        order.total,
          });
          console.log("[webhook] Refund confirmation email sent to", order.delivery.email);
        } catch (emailErr) {
          console.error("[webhook] Failed to send refund confirmation email:", emailErr);
        }
      }
    } catch (err) {
      console.error("[webhook] Failed to process refund.processed event:", err);
    }
  }

  return Response.json({ success: true });
}
