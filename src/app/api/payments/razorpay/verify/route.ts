import crypto from "crypto";
import { z } from "zod";
import { validateCheckoutOrder, firePromoUsage } from "@/lib/checkout/validate-order";
import { createOrder } from "@/services/order.service";

const deliverySchema = z.object({
  fullName: z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().length(10).regex(/^\d{10}$/),
  address:  z.string().min(5),
  city:     z.string().min(2),
  postcode: z.string().min(5).max(8),
});

const itemSchema = z.object({
  productId: z.string(),
  name:      z.string(),
  slug:      z.string(),
  price:     z.number().positive(),
  quantity:  z.number().int().positive(),
  image:     z.string(),
  category:  z.string().optional(),
});

const bodySchema = z.object({
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  delivery:          deliverySchema,
  items:             z.array(itemSchema).min(1),
  promoCode:         z.string().optional(),
  userId:            z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      delivery,
      items,
      promoCode,
      userId,
    } = parsed.data;

    // ── Verify Razorpay HMAC signature ────────────────────────────────────────
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return Response.json({ success: false, error: "Payment configuration error." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return Response.json(
        { success: false, error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // ── Re-validate totals server-side ────────────────────────────────────────
    const validated = await validateCheckoutOrder({ items, delivery, promoCode, userId, paymentMethod: "razorpay" });

    // ── Persist order ─────────────────────────────────────────────────────────
    const result = await createOrder({
      userId,
      items:             validated.items,
      delivery:          validated.delivery,
      subtotal:          validated.subtotal,
      deliveryFee:       validated.deliveryFee,
      codCharge:         validated.codCharge,
      discount:          validated.discount,
      promoCode:         validated.promoCode,
      total:             validated.total,
      paymentMethod:     "razorpay",
      paymentStatus:     "paid",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    await firePromoUsage(
      validated.promoCode,
      validated.promoDocId,
      userId,
      result.orderId,
      validated.discount,
    );

    return Response.json({
      success: true,
      data: {
        orderId:     result.orderId,
        orderNumber: result.orderNumber,
        total:       validated.total,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment verification failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
