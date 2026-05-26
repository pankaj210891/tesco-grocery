import crypto from "crypto";
import { getOrderByRefundId, setOrderRefund } from "@/services/order.service";
import { sendRefundConfirmed } from "@/services/email.service";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error({}, "RAZORPAY_WEBHOOK_SECRET is not set");
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
      const order = await getOrderByRefundId(refundId);
      if (!order) {
        logger.warn({ refundId }, "no order found for refund");
        return Response.json({ success: true });
      }

      await setOrderRefund(order.orderNumber, refundId, "processed");

      if (order) {
        try {
          await sendRefundConfirmed(order.delivery.email, {
            orderNumber:  order.orderNumber,
            customerName: order.delivery.fullName,
            total:        order.total,
          });
          logger.info({ email: order.delivery.email }, "refund confirmation email sent");
        } catch (emailErr) {
          logger.error({ err: emailErr }, "failed to send refund confirmation email");
        }
      }
    } catch (err) {
      logger.error({ err }, "failed to process refund.processed event");
    }
  }

  return Response.json({ success: true });
}
